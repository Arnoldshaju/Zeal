from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Workspace
from .serializers import WorkspaceSerializer


class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            owner_id=self.request.user.id
        )

    def perform_create(self, serializer):
        serializer.save(
            owner_id=self.request.user.id
        )


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            owner_id=self.request.user.id
        )
