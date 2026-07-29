from drf_spectacular.utils import extend_schema, inline_serializer
from django.shortcuts import render
from django.views.decorators.cache import cache_page
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(
    responses=inline_serializer(
        name="HealthCheck",
        fields={
            "status": serializers.CharField(),
            "service": serializers.CharField(),
        },
    )
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response(
        {
            "status": "ok",
            "service": "Zeal API",
        }
    )


@cache_page(30)
def status_page(request):
    return render(
        request,
        "status.html",
        {"service": "Zeal API", "status": "Running"},
    )
