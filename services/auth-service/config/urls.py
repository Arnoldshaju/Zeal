"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from users.views import RegisterView


urlpatterns = [

    # ========================================================
    # ADMIN
    # ========================================================

    path(
        "admin/",
        admin.site.urls,
    ),

    # ========================================================
    # LOGIN
    # ========================================================

    path(
        "api/auth/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    # ========================================================
    # REFRESH TOKEN
    # ========================================================

    path(
        "api/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # ========================================================
    # REGISTER
    # ========================================================

    path(
        "api/auth/register/",
        RegisterView.as_view(),
        name="register",
    ),
]