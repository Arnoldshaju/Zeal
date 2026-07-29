from django.db import migrations, models
import django.db.models.deletion


def mark_existing_users_verified(apps, schema_editor):
    User = apps.get_model("auth", "User")
    EmailVerification = apps.get_model("users", "EmailVerification")
    EmailVerification.objects.bulk_create(
        [
            EmailVerification(user_id=user_id, is_verified=True)
            for user_id in User.objects.values_list("id", flat=True)
        ],
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailVerification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("is_verified", models.BooleanField(default=False)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_verification",
                        to="auth.user",
                    ),
                ),
            ],
        ),
        migrations.RunPython(mark_existing_users_verified, migrations.RunPython.noop),
    ]
