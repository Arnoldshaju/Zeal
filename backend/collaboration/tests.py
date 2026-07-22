from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken

from config.asgi import application
from documents.models import Document, DocumentMember, MemberRole


class DocumentConsumerTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user("owner", password="password123")
        self.editor = user_model.objects.create_user("editor", password="password123")
        self.viewer = user_model.objects.create_user("viewer", password="password123")
        self.outsider = user_model.objects.create_user("outsider", password="password123")
        self.document = Document.objects.create(owner=self.owner, title="Shared document")
        DocumentMember.objects.create(
            document=self.document, user=self.editor, role=MemberRole.EDITOR
        )
        DocumentMember.objects.create(
            document=self.document, user=self.viewer, role=MemberRole.VIEWER
        )

    def test_owner_and_editor_can_update_and_viewer_is_read_only(self):
        update = async_to_sync(self.run_authorized_scenario)()
        self.document.refresh_from_db()
        self.assertEqual(self.document.content, update)

    def test_anonymous_and_outsider_connections_are_rejected(self):
        async_to_sync(self.run_rejected_scenario)()

    def communicator(self, user=None):
        token = f"?token={AccessToken.for_user(user)}" if user else ""
        return WebsocketCommunicator(
            application,
            f"/ws/documents/{self.document.id}/{token}",
            headers=[(b"origin", b"http://localhost:3000")],
        )

    async def run_authorized_scenario(self):
        owner = self.communicator(self.owner)
        editor = self.communicator(self.editor)
        viewer = self.communicator(self.viewer)

        self.assertTrue((await owner.connect())[0])
        self.assertEqual((await owner.receive_json_from())["action"], "joined")

        self.assertTrue((await editor.connect())[0])
        self.assertEqual((await editor.receive_json_from())["action"], "joined")
        self.assertEqual((await owner.receive_json_from())["username"], "editor")

        self.assertTrue((await viewer.connect())[0])
        self.assertEqual((await viewer.receive_json_from())["action"], "joined")
        self.assertEqual((await owner.receive_json_from())["username"], "viewer")
        self.assertEqual((await editor.receive_json_from())["username"], "viewer")

        update = {"type": "doc", "content": [{"type": "paragraph"}]}
        await owner.send_json_to({"type": "document.update", "update": update})
        self.assertEqual(
            await editor.receive_json_from(),
            {"type": "document.update", "update": update},
        )
        self.assertEqual(
            await viewer.receive_json_from(),
            {"type": "document.update", "update": update},
        )
        self.assertTrue(await owner.receive_nothing())

        await viewer.send_json_to(
            {"type": "document.update", "update": {"forbidden": True}}
        )
        error = await viewer.receive_json_from()
        self.assertEqual(error["code"], "forbidden")
        self.assertTrue(await owner.receive_nothing())
        self.assertTrue(await editor.receive_nothing())

        editor_update = {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}}]}
        await editor.send_json_to(
            {"type": "document.update", "update": editor_update}
        )
        self.assertEqual((await owner.receive_json_from())["update"], editor_update)
        self.assertEqual((await viewer.receive_json_from())["update"], editor_update)

        await self.change_role(self.editor.id, MemberRole.VIEWER)
        await editor.send_json_to(
            {"type": "document.update", "update": {"forbidden": True}}
        )
        self.assertEqual((await editor.receive_json_from())["code"], "forbidden")
        self.assertTrue(await owner.receive_nothing())

        await viewer.disconnect()
        self.assertEqual((await owner.receive_json_from())["action"], "left")
        self.assertEqual((await editor.receive_json_from())["action"], "left")
        await owner.disconnect()
        await editor.disconnect()
        return editor_update

    async def run_rejected_scenario(self):
        anonymous = self.communicator()
        connected, code = await anonymous.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4401)

        outsider = self.communicator(self.outsider)
        connected, code = await outsider.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4403)

    @database_sync_to_async
    def change_role(self, user_id, role):
        DocumentMember.objects.filter(
            document=self.document, user_id=user_id
        ).update(role=role)
