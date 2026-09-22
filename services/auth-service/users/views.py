from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


User = get_user_model()


class RegisterView(APIView):
    """
    Register a new user.
    """

    permission_classes = [AllowAny]

    def post(self, request):

        # Get data from request
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        # ====================================================
        # VALIDATION
        # ====================================================

        if not username or not email or not password:
            return Response(
                {
                    "error": "Username, email and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # CHECK USERNAME
        # ====================================================

        if User.objects.filter(username=username).exists():
            return Response(
                {
                    "error": "Username already exists."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # CHECK EMAIL
        # ====================================================

        if User.objects.filter(email=email).exists():
            return Response(
                {
                    "error": "Email already exists."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # CREATE USER
        # ====================================================

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        # ====================================================
        # RESPONSE
        # ====================================================

        return Response(
            {
                "message": "User registered successfully.",
                "username": user.username,
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )