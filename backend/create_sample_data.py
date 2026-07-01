"""
Quick script to seed sample data for manual testing.
Run with: python manage.py shell < create_sample_data.py
  OR: python manage.py runscript create_sample_data  (if django-extensions installed)

Usage:
  cd backend
  venv\Scripts\activate
  python manage.py shell -c "exec(open('create_sample_data.py').read())"
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'debriefpro.settings')
django.setup()

from datetime import date, timedelta, time
from users.models import User
from debriefs.models import DailyDebrief, HourlyLog, Feedback

print("Creating sample users...")

# Admin
admin, _ = User.objects.get_or_create(
    username='admin',
    defaults=dict(
        email='admin@debriefpro.com',
        first_name='Admin',
        last_name='User',
        role=User.Role.ADMIN,
        is_staff=True,
        is_superuser=True,
    )
)
if _:
    admin.set_password('Admin@1234')
    admin.save()
    print(f"  Created admin: admin / Admin@1234")

# Supervisor
supervisor, _ = User.objects.get_or_create(
    username='supervisor1',
    defaults=dict(
        email='supervisor@debriefpro.com',
        first_name='Sarah',
        last_name='Mitchell',
        role=User.Role.SUPERVISOR,
    )
)
if _:
    supervisor.set_password('Supervisor@1234')
    supervisor.save()
    print(f"  Created supervisor: supervisor1 / Supervisor@1234")

# Intern
intern, _ = User.objects.get_or_create(
    username='intern1',
    defaults=dict(
        email='intern@debriefpro.com',
        first_name='Jordan',
        last_name='Lee',
        role=User.Role.INTERN,
        supervisor=supervisor,
    )
)
if _:
    intern.set_password('Intern@1234')
    intern.save()
    print(f"  Created intern: intern1 / Intern@1234")

print("\nCreating sample debriefs and logs...")

tasks = [
    ("Set up development environment", "Completed environment setup", "Version conflicts with npm packages", "Start working on authentication module"),
    ("Built login endpoint", "JWT auth is working", "CORS issues with frontend", "Set up user registration"),
    ("Implemented user registration", "Registration form validates and submits", "Password validation edge cases", "Write tests for auth endpoints"),
    ("Wrote auth tests (8 passing)", "All tests pass", "Mocking JWT in tests is tricky", "Begin dashboard API"),
    ("Built dashboard stats endpoint", "Stats endpoint returns correct data", "Performance with large datasets", "Implement debrief CRUD"),
]

for i, (yesterday, progress, challenges, today) in enumerate(tasks):
    log_date = date.today() - timedelta(days=len(tasks) - i - 1)
    debrief, created = DailyDebrief.objects.get_or_create(
        intern=intern,
        date=log_date,
        defaults=dict(
            yesterday_task=yesterday,
            progress_made=progress,
            challenges=challenges,
            today_task=today,
            notes="All good overall." if i % 2 == 0 else "",
        )
    )
    if created:
        print(f"  Debrief for {log_date}")

    # Hourly logs
    log_entries = [
        (time(9, 0), time(10, 30), f"Morning standup and task planning for {today_short}", 4),
        (time(10, 30), time(12, 0), "Deep work session", 5),
        (time(13, 0), time(14, 30), "Code review and pair programming", 4),
        (time(14, 30), time(16, 0), "Testing and bug fixing", 3),
    ] if i % 2 == 0 else [
        (time(9, 0), time(11, 0), "Design review", 4),
        (time(11, 0), time(12, 30), "Implementation", 5),
        (time(13, 0), time(15, 0), "Documentation", 3),
    ]

    for start, end, activity, score in log_entries:
        today_short = today[:30]
        HourlyLog.objects.get_or_create(
            intern=intern,
            date=log_date,
            start_time=start,
            end_time=end,
            defaults=dict(activity=activity, productivity_score=score)
        )

    # Add feedback to some debriefs
    if i < 3 and not hasattr(debrief, 'feedback'):
        try:
            Feedback.objects.get_or_create(
                debrief=debrief,
                defaults=dict(
                    supervisor=supervisor,
                    content=f"Good work on day {i+1}! {['Keep it up!', 'Great progress.', 'Address the challenges proactively.'][i % 3]}"
                )
            )
        except Exception:
            pass

print("\nSample data created successfully!")
print("\nCredentials:")
print("  Admin      — admin / Admin@1234")
print("  Supervisor — supervisor1 / Supervisor@1234")
print("  Intern     — intern1 / Intern@1234")
