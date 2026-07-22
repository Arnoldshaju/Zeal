from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from documents.models import Document, DocumentMember, MemberRole


class DocumentConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.room_name = f"document_{self.document_id}"
        self.joined = False

        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return

        access = await self.document_access(user.id, self.document_id)
        if access is None:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        self.joined = True
        await self.accept()
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "presence.update",
                "userId": user.id,
                "username": user.get_username(),
                "action": "joined",
            },
        )

    async def disconnect(self, close_code):
        if not getattr(self, "joined", False):
            return
        await self.channel_layer.group_discard(self.room_name, self.channel_name)
        user = self.scope["user"]
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "presence.update",
                "userId": user.id,
                "username": user.get_username(),
                "action": "left",
            },
        )

    async def receive_json(self, content, **kwargs):
        if content.get("type") != "document.update":
            await self.send_json(
                {"type": "error", "code": "unknown_event", "message": "Unknown event type."}
            )
            return
        access = await self.document_access(self.scope["user"].id, self.document_id)
        if access is None:
            await self.send_json(
                {"type": "error", "code": "forbidden", "message": "Document access was removed."}
            )
            await self.close(code=4403)
            return
        if not access:
            await self.send_json(
                {
                    "type": "error",
                    "code": "forbidden",
                    "message": "Viewer members cannot update documents.",
                }
            )
            return

        update = content.get("update")
        await self.persist_update(self.document_id, update)
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "document.update",
                "update": update,
                "sender": self.channel_name,
            },
        )

    async def document_update(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send_json({"type": "document.update", "update": event["update"]})

    async def presence_update(self, event):
        await self.send_json(
            {
                "type": "presence.update",
                "userId": event["userId"],
                "username": event["username"],
                "action": event["action"],
            }
        )

    @staticmethod
    @database_sync_to_async
    def document_access(user_id, document_id):
        document = Document.objects.filter(id=document_id).only("owner_id").first()
        if document is None:
            return None
        if document.owner_id == user_id:
            return True
        membership = DocumentMember.objects.filter(
            document_id=document_id, user_id=user_id
        ).only("role").first()
        if membership is None:
            return None
        return membership.role in {MemberRole.OWNER, MemberRole.EDITOR}

    @staticmethod
    @database_sync_to_async
    def persist_update(document_id, update):
        Document.objects.filter(id=document_id).update(
            content=update,
            updated_at=timezone.now(),
        )
