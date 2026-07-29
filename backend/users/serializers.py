from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import EmailVerification


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized_email

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
        EmailVerification.objects.create(user=user)
        transaction.on_commit(lambda: send_verification_email(user))
        return user


class UserSerializer(serializers.ModelSerializer):
    is_email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "is_email_verified")

    def get_is_email_verified(self, user):
        verification = getattr(user, "email_verification", None)
        return verification.is_verified if verification else True


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        verification = getattr(self.user, "email_verification", None)
        if verification is not None and not verification.is_verified:
            raise serializers.ValidationError(
                {"email": "Verify your email address before signing in."}
            )
        return data


class EmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class TokenConfirmationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetConfirmSerializer(TokenConfirmationSerializer):
    new_password = serializers.CharField(write_only=True, min_length=4)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
