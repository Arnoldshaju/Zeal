from rest_framework import serializers

from .models import Document, DocumentMember


class DocumentMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = DocumentMember
        fields = ("id", "user", "username", "email", "role", "created_at")
        read_only_fields = ("id", "created_at")


class DocumentSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    members = DocumentMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "content",
            "owner",
            "owner_username",
            "members",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "created_at", "updated_at")
