"""URL routes for debriefs app."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyDebriefViewSet, FeedbackViewSet, HourlyLogViewSet, ReportViewSet

router = DefaultRouter()
router.register(r'debriefs', DailyDebriefViewSet, basename='debrief')
router.register(r'hourly-logs', HourlyLogViewSet, basename='hourly-log')
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]
