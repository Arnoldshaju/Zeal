from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        verification = getattr(user, "email_verification", None)
        is_verified = verification.is_verified if verification else False
        return f"{user.pk}{user.email}{is_verified}{timestamp}"


email_verification_token_generator = EmailVerificationTokenGenerator()
