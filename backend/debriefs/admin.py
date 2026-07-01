"""Admin site registration for debrief models."""
from django.contrib import admin
from .models import DailyDebrief, Feedback, HourlyLog


class FeedbackInline(admin.StackedInline):
    model = Feedback
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(DailyDebrief)
class DailyDebriefAdmin(admin.ModelAdmin):
    list_display = ('intern', 'date', 'created_at', 'has_feedback')
    list_filter = ('date', 'intern')
    search_fields = ('intern__username', 'yesterday_task', 'today_task')
    ordering = ('-date',)
    inlines = [FeedbackInline]

    @admin.display(boolean=True)
    def has_feedback(self, obj):
        return hasattr(obj, 'feedback') and obj.feedback is not None


@admin.register(HourlyLog)
class HourlyLogAdmin(admin.ModelAdmin):
    list_display = ('intern', 'date', 'start_time', 'end_time', 'productivity_score')
    list_filter = ('date', 'productivity_score', 'intern')
    search_fields = ('intern__username', 'activity')
    ordering = ('-date', 'start_time')


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('debrief', 'supervisor', 'created_at')
    list_filter = ('supervisor',)
    search_fields = ('content', 'supervisor__username')
