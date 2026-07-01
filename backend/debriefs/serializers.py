"""DRF serializers for DailyDebrief, HourlyLog, and Feedback."""
from rest_framework import serializers

from users.serializers import UserBasicSerializer
from .models import DailyDebrief, Feedback, HourlyLog


class FeedbackSerializer(serializers.ModelSerializer):
    supervisor_detail = UserBasicSerializer(source='supervisor', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'debrief', 'supervisor', 'supervisor_detail', 'content', 'created_at']
        read_only_fields = ['id', 'created_at', 'supervisor']

    def create(self, validated_data):
        # Automatically assign the requesting supervisor
        validated_data['supervisor'] = self.context['request'].user
        return super().create(validated_data)


class DailyDebriefSerializer(serializers.ModelSerializer):
    intern_detail = UserBasicSerializer(source='intern', read_only=True)
    feedback = FeedbackSerializer(read_only=True)

    class Meta:
        model = DailyDebrief
        fields = [
            'id', 'intern', 'intern_detail', 'date',
            'yesterday_task', 'progress_made', 'challenges',
            'today_task', 'notes', 'feedback',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'intern', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Assign intern from the request user (must be INTERN role)
        validated_data['intern'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context['request']
        intern = request.user
        date = attrs.get('date')
        # On create, check uniqueness; on update, skip if same instance
        if self.instance is None:
            if DailyDebrief.objects.filter(intern=intern, date=date).exists():
                raise serializers.ValidationError(
                    {'date': 'You have already submitted a debrief for this date.'}
                )
        return attrs


class HourlyLogSerializer(serializers.ModelSerializer):
    intern_detail = UserBasicSerializer(source='intern', read_only=True)
    duration_hours = serializers.ReadOnlyField()

    class Meta:
        model = HourlyLog
        fields = [
            'id', 'intern', 'intern_detail', 'date',
            'start_time', 'end_time', 'activity',
            'productivity_score', 'duration_hours', 'created_at',
        ]
        read_only_fields = ['id', 'intern', 'duration_hours', 'created_at']

    def create(self, validated_data):
        validated_data['intern'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        if attrs.get('end_time') and attrs.get('start_time'):
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError(
                    {'end_time': 'End time must be after start time.'}
                )
        return attrs
