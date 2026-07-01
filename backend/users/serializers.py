"""Serializers for the users app."""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class UserBasicSerializer(serializers.ModelSerializer):
    """Minimal user info used in nested contexts."""

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer for read operations."""
    supervisor_detail = UserBasicSerializer(source='supervisor', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'supervisor', 'supervisor_detail', 'is_active',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new user (registration or admin creation)."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role', 'supervisor',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user data (admin use)."""

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'role', 'supervisor', 'is_active',
        ]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token with user info embedded."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
