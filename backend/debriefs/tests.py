"""Tests for debriefs app: debriefs, logs, feedback, exports."""
import io
from datetime import date, time

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from .models import DailyDebrief, Feedback, HourlyLog


class DebriefSetupMixin:
    """Helper to create users and test data."""

    def make_user(self, username, role, password='Test@1234', supervisor=None):
        return User.objects.create_user(
            username=username,
            password=password,
            role=role,
            email=f'{username}@test.com',
            supervisor=supervisor,
        )

    def auth(self, username, password='Test@1234'):
        url = reverse('token_obtain_pair')
        res = self.client.post(url, {'username': username, 'password': password})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')

    def make_debrief(self, intern, debrief_date=None):
        return DailyDebrief.objects.create(
            intern=intern,
            date=debrief_date or date.today(),
            yesterday_task='Worked on feature X',
            progress_made='Completed 80%',
            challenges='Integration issues',
            today_task='Fix integration',
        )

    def make_log(self, intern, log_date=None, score=4):
        return HourlyLog.objects.create(
            intern=intern,
            date=log_date or date.today(),
            start_time=time(9, 0),
            end_time=time(10, 0),
            activity='Writing tests',
            productivity_score=score,
        )


class DailyDebriefTests(APITestCase, DebriefSetupMixin):

    def setUp(self):
        self.admin = self.make_user('admin1', User.Role.ADMIN)
        self.supervisor = self.make_user('sup1', User.Role.SUPERVISOR)
        self.intern = self.make_user('intern1', User.Role.INTERN)
        self.intern2 = self.make_user('intern2', User.Role.INTERN)

    def test_intern_can_create_debrief(self):
        self.auth('intern1')
        url = reverse('debrief-list')
        data = {
            'date': str(date.today()),
            'yesterday_task': 'Built API',
            'progress_made': 'Done',
            'challenges': 'None',
            'today_task': 'Write docs',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['intern'], self.intern.id)

    def test_intern_cannot_submit_duplicate_debrief(self):
        self.make_debrief(self.intern)
        self.auth('intern1')
        url = reverse('debrief-list')
        data = {
            'date': str(date.today()),
            'yesterday_task': 'Duplicate',
            'progress_made': 'Duplicate',
            'challenges': 'Duplicate',
            'today_task': 'Duplicate',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_intern_can_only_see_own_debriefs(self):
        self.make_debrief(self.intern)
        self.make_debrief(self.intern2, date(2024, 1, 5))
        self.auth('intern1')
        url = reverse('debrief-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # All returned debriefs belong to intern1
        for d in res.data['results']:
            self.assertEqual(d['intern'], self.intern.id)

    def test_supervisor_can_see_all_debriefs(self):
        self.make_debrief(self.intern)
        self.make_debrief(self.intern2, date(2024, 1, 5))
        self.auth('sup1')
        url = reverse('debrief-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 2)

    def test_supervisor_cannot_create_debrief(self):
        self.auth('sup1')
        url = reverse('debrief-list')
        data = {
            'date': str(date.today()),
            'yesterday_task': 'X',
            'progress_made': 'X',
            'challenges': 'X',
            'today_task': 'X',
        }
        res = self.client.post(url, data)
        # Supervisor is not an intern, so role check fails in serializer validation
        # The debrief would get created with supervisor as intern (server error) — we test 400/403
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    def test_stats_endpoint(self):
        self.make_debrief(self.intern)
        self.auth('intern1')
        url = reverse('debrief-stats')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_debriefs', res.data)
        self.assertEqual(res.data['total_debriefs'], 1)


class HourlyLogTests(APITestCase, DebriefSetupMixin):

    def setUp(self):
        self.admin = self.make_user('admin2', User.Role.ADMIN)
        self.supervisor = self.make_user('sup2', User.Role.SUPERVISOR)
        self.intern = self.make_user('intern3', User.Role.INTERN)

    def test_intern_can_create_log(self):
        self.auth('intern3')
        url = reverse('hourly-log-list')
        data = {
            'date': str(date.today()),
            'start_time': '09:00',
            'end_time': '10:30',
            'activity': 'Code review',
            'productivity_score': 4,
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['intern'], self.intern.id)

    def test_end_time_before_start_time_rejected(self):
        self.auth('intern3')
        url = reverse('hourly-log-list')
        data = {
            'date': str(date.today()),
            'start_time': '10:00',
            'end_time': '09:00',
            'activity': 'Time paradox',
            'productivity_score': 3,
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_productivity_score_out_of_range(self):
        self.auth('intern3')
        url = reverse('hourly-log-list')
        data = {
            'date': str(date.today()),
            'start_time': '09:00',
            'end_time': '10:00',
            'activity': 'Bad score',
            'productivity_score': 6,
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_productivity_summary_endpoint(self):
        self.make_log(self.intern, score=5)
        self.auth('intern3')
        url = reverse('hourly-log-productivity-summary')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)


class FeedbackTests(APITestCase, DebriefSetupMixin):

    def setUp(self):
        self.admin = self.make_user('admin3', User.Role.ADMIN)
        self.supervisor = self.make_user('sup3', User.Role.SUPERVISOR)
        self.intern = self.make_user('intern4', User.Role.INTERN)
        self.debrief = self.make_debrief(self.intern)

    def test_supervisor_can_add_feedback(self):
        self.auth('sup3')
        url = reverse('feedback-list')
        data = {
            'debrief': self.debrief.id,
            'content': 'Good job! Keep up the progress.',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['supervisor'], self.supervisor.id)

    def test_intern_cannot_add_feedback(self):
        self.auth('intern4')
        url = reverse('feedback-list')
        data = {
            'debrief': self.debrief.id,
            'content': 'Self praise.',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_intern_can_view_own_feedback(self):
        Feedback.objects.create(
            debrief=self.debrief,
            supervisor=self.supervisor,
            content='Great work!',
        )
        self.auth('intern4')
        url = reverse('feedback-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)


class ReportExportTests(APITestCase, DebriefSetupMixin):

    def setUp(self):
        self.admin = self.make_user('admin4', User.Role.ADMIN)
        self.supervisor = self.make_user('sup4', User.Role.SUPERVISOR)
        self.intern = self.make_user('intern5', User.Role.INTERN)
        self.debrief = self.make_debrief(self.intern)
        self.log = self.make_log(self.intern)
        Feedback.objects.create(
            debrief=self.debrief,
            supervisor=self.supervisor,
            content='Excellent!',
        )

    def test_admin_can_download_excel(self):
        self.auth('admin4')
        url = reverse('report-excel') + f'?start_date={date.today()}&end_date={date.today()}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        self.assertGreater(len(res.content), 0)

    def test_admin_can_download_pdf(self):
        self.auth('admin4')
        url = reverse('report-pdf') + f'?start_date={date.today()}&end_date={date.today()}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        # PDF starts with %PDF
        self.assertTrue(res.content.startswith(b'%PDF'))

    def test_supervisor_cannot_access_reports(self):
        self.auth('sup4')
        url = reverse('report-excel') + f'?start_date={date.today()}&end_date={date.today()}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_intern_cannot_access_reports(self):
        self.auth('intern5')
        url = reverse('report-excel') + f'?start_date={date.today()}&end_date={date.today()}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
