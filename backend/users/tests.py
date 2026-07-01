"""Tests for users app: registration, login, roles, permissions."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User


class UserSetupMixin:
    """Helper to create test users quickly."""

    def make_user(self, username, role, password='Test@1234', supervisor=None):
        user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            email=f'{username}@test.com',
            supervisor=supervisor,
        )
        return user

    def get_tokens(self, username, password='Test@1234'):
        url = reverse('token_obtain_pair')
        res = self.client.post(url, {'username': username, 'password': password})
        return res.data.get('access'), res.data.get('refresh')

    def auth(self, username, password='Test@1234'):
        access, _ = self.get_tokens(username, password)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        return access


class RegistrationTests(APITestCase, UserSetupMixin):

    def test_register_creates_intern(self):
        url = reverse('register')
        data = {
            'username': 'newintern',
            'email': 'newintern@test.com',
            'password': 'Test@1234',
            'password_confirm': 'Test@1234',
            'first_name': 'New',
            'last_name': 'Intern',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='newintern')
        self.assertEqual(user.role, User.Role.INTERN)

    def test_register_password_mismatch(self):
        url = reverse('register')
        data = {
            'username': 'mismatch',
            'email': 'mm@test.com',
            'password': 'Test@1234',
            'password_confirm': 'Wrong@1234',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase, UserSetupMixin):

    def setUp(self):
        self.intern = self.make_user('intern1', User.Role.INTERN)

    def test_login_returns_tokens_and_user(self):
        url = reverse('token_obtain_pair')
        res = self.client.post(url, {'username': 'intern1', 'password': 'Test@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['role'], User.Role.INTERN)

    def test_invalid_login(self):
        url = reverse('token_obtain_pair')
        res = self.client.post(url, {'username': 'intern1', 'password': 'wrongpassword'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class UserManagementTests(APITestCase, UserSetupMixin):

    def setUp(self):
        self.admin = self.make_user('admin1', User.Role.ADMIN)
        self.supervisor = self.make_user('sup1', User.Role.SUPERVISOR)
        self.intern = self.make_user('intern1', User.Role.INTERN)

    def test_admin_can_list_all_users(self):
        self.auth('admin1')
        url = reverse('user-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_supervisor_can_list_interns(self):
        self.auth('sup1')
        url = reverse('user-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_intern_cannot_list_users(self):
        self.auth('intern1')
        url = reverse('user-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        self.auth('admin1')
        url = reverse('user-list')
        data = {
            'username': 'newsup',
            'email': 'newsup@test.com',
            'password': 'Test@1234',
            'password_confirm': 'Test@1234',
            'role': User.Role.SUPERVISOR,
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_intern_cannot_create_user(self):
        self.auth('intern1')
        url = reverse('user-list')
        data = {
            'username': 'hacker',
            'email': 'hacker@test.com',
            'password': 'Test@1234',
            'password_confirm': 'Test@1234',
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_endpoint_returns_current_user(self):
        self.auth('intern1')
        url = reverse('me')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'intern1')

    def test_logout_blacklists_token(self):
        access, refresh = self.get_tokens('intern1')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        url = reverse('logout')
        res = self.client.post(url, {'refresh': refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
