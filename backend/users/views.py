from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerification
from .serializers import (
    EmailRequestSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    TokenConfirmationSerializer,
    UserSerializer,
    VerifiedTokenObtainPairSerializer,
)
from .services import send_password_reset_email, send_verification_email
from .tokens import email_verification_token_generator


User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CurrentUserView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LoginView(TokenObtainPairView):
    serializer_class = VerifiedTokenObtainPairSerializer


class EmailVerificationRequestView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailRequestSerializer

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"].strip()
        ).first()
        verification_link = None
        if user is not None:
            verification, _ = EmailVerification.objects.get_or_create(user=user)
            if not verification.is_verified:
                verification_link = send_verification_email(user)
        data = {
            "detail": "If the account exists and is unverified, a verification email was sent."
        }
        if settings.DEBUG and verification_link:
            data["debug_url"] = verification_link
        return Response(data)


class EmailVerificationConfirmView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TokenConfirmationSerializer

    def post(self, request):
        serializer = TokenConfirmationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.user_from_uid(serializer.validated_data["uid"])
        token = serializer.validated_data["token"]
        if user is None or not email_verification_token_generator.check_token(user, token):
            raise ValidationError({"token": "This verification link is invalid or expired."})
        verification, _ = EmailVerification.objects.get_or_create(user=user)
        verification.is_verified = True
        verification.verified_at = timezone.now()
        verification.save(update_fields=["is_verified", "verified_at", "updated_at"])
        return Response({"detail": "Email address verified. You can now sign in."})

    @staticmethod
    def user_from_uid(uid):
        try:
            return User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return None


class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailRequestSerializer

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"].strip(),
            is_active=True,
        ).first()
        reset_link = None
        if user is not None:
            reset_link = send_password_reset_email(user)
        data = {"detail": "If the account exists, a password reset email was sent."}
        if settings.DEBUG and reset_link:
            data["debug_url"] = reset_link
        return Response(data)


class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = EmailVerificationConfirmView.user_from_uid(
            serializer.validated_data["uid"]
        )
        token = serializer.validated_data["token"]
        if user is None or not default_token_generator.check_token(user, token):
            raise ValidationError({"token": "This password reset link is invalid or expired."})
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now sign in."})


class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": "The refresh token is invalid."}) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)
