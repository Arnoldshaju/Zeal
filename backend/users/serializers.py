from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import EmailVerification


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        return value.strip().lower()

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        from workspaces.services import create_personal_workspace
        from .services import send_verification_email

        create_personal_workspace(user)
        EmailVerification.objects.create(user=user, is_verified=True)
        transaction.on_commit(lambda: send_verification_email(user))
        return user


class UserSerializer(serializers.ModelSerializer):
    is_email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "is_email_verified")

    def get_is_email_verified(self, user) -> bool:
        verification = getattr(user, "email_verification", None)
        return verification.is_verified if verification else True


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field)
        password = attrs.get("password")

        if username_or_email and password:
            users = User.objects.filter(
                models.Q(username__iexact=username_or_email) | models.Q(email__iexact=username_or_email)
            )
            found_user = None
            for u in users:
                if u.check_password(password):
                    found_user = u
                    break
            if found_user:
                attrs[self.username_field] = found_user.username

        data = super().validate(attrs)
        verification, _ = EmailVerification.objects.get_or_create(
            user=self.user, defaults={"is_verified": True}
        )
        if not verification.is_verified:
            verification.is_verified = True
            verification.save()
        return data


class EmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class TokenConfirmationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetConfirmSerializer(TokenConfirmationSerializer):
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
