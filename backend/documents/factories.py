import factory

from users.factories import UserFactory

from .models import Document


class DocumentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Document

    title = factory.Sequence(lambda number: f"Document {number}")
    owner = factory.SubFactory(UserFactory)
