"""ViewSets for DailyDebrief, HourlyLog, Feedback; report endpoints."""
from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import User
from users.permissions import IsAdmin, IsAdminOrSupervisor
from .models import DailyDebrief, Feedback, HourlyLog
from .permissions import CanWriteFeedback, IsOwnerIntern
from .reports import generate_excel_report, generate_pdf_report
from .serializers import DailyDebriefSerializer, FeedbackSerializer, HourlyLogSerializer


class DailyDebriefViewSet(viewsets.ModelViewSet):
    """
    CRUD for daily debriefs.
    - Interns: can create/update/view their own.
    - Supervisors/Admins: read-only on all; admins can delete.
    """
    serializer_class = DailyDebriefSerializer
    permission_classes = [IsAuthenticated, IsOwnerIntern]

    def get_queryset(self):
        user = self.request.user
        qs = DailyDebrief.objects.select_related(
            'intern', 'feedback', 'feedback__supervisor'
        ).order_by('-date')

        if user.is_intern:
            qs = qs.filter(intern=user)
        # Supervisors and admins see all

        # Optional filter params
        intern_id = self.request.query_params.get('intern_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        return qs

    def get_permissions(self):
        if self.action in ('destroy',):
            return [IsAdmin()]
        return [IsAuthenticated(), IsOwnerIntern()]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        """Return today's debrief for the requesting intern, or 404."""
        if not request.user.is_intern:
            return Response({'detail': 'Only interns have a today debrief.'}, status=400)
        try:
            debrief = DailyDebrief.objects.get(intern=request.user, date=date.today())
            return Response(DailyDebriefSerializer(debrief, context={'request': request}).data)
        except DailyDebrief.DoesNotExist:
            return Response({'detail': 'No debrief found for today.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Aggregate stats for the requesting user (or an intern if supervisor/admin)."""
        user = request.user
        intern_id = request.query_params.get('intern_id')

        if user.is_intern:
            qs = DailyDebrief.objects.filter(intern=user)
        elif intern_id:
            qs = DailyDebrief.objects.filter(intern_id=intern_id)
        else:
            qs = DailyDebrief.objects.all()

        total = qs.count()
        with_feedback = qs.filter(feedback__isnull=False).count()
        last_7 = qs.filter(date__gte=date.today() - timedelta(days=7)).count()

        return Response({
            'total_debriefs': total,
            'debriefs_with_feedback': with_feedback,
            'debriefs_last_7_days': last_7,
        })


class HourlyLogViewSet(viewsets.ModelViewSet):
    """
    CRUD for hourly logs.
    - Interns: manage their own.
    - Supervisors/Admins: view all.
    """
    serializer_class = HourlyLogSerializer
    permission_classes = [IsAuthenticated, IsOwnerIntern]

    def get_queryset(self):
        user = self.request.user
        qs = HourlyLog.objects.select_related('intern').order_by('-date', 'start_time')

        if user.is_intern:
            qs = qs.filter(intern=user)

        intern_id = self.request.query_params.get('intern_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        return qs

    def get_permissions(self):
        if self.action in ('destroy',):
            return [IsAdmin()]
        return [IsAuthenticated(), IsOwnerIntern()]

    @action(detail=False, methods=['get'], url_path='productivity-summary')
    def productivity_summary(self, request):
        """Return average productivity per day for charting."""
        user = request.user
        intern_id = request.query_params.get('intern_id')

        if user.is_intern:
            qs = HourlyLog.objects.filter(intern=user)
        elif intern_id:
            qs = HourlyLog.objects.filter(intern_id=intern_id)
        else:
            qs = HourlyLog.objects.all()

        from django.db.models import Avg, Count
        summary = (
            qs.values('date')
            .annotate(avg_score=Avg('productivity_score'), log_count=Count('id'))
            .order_by('date')
        )
        return Response(list(summary))


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    Feedback viewset.
    - Supervisors/Admins can create and update.
    - Everyone can read.
    """
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated, CanWriteFeedback]

    def get_queryset(self):
        user = self.request.user
        qs = Feedback.objects.select_related(
            'debrief', 'debrief__intern', 'supervisor'
        ).order_by('-created_at')

        if user.is_intern:
            qs = qs.filter(debrief__intern=user)

        debrief_id = self.request.query_params.get('debrief_id')
        if debrief_id:
            qs = qs.filter(debrief_id=debrief_id)

        return qs

    def perform_create(self, serializer):
        serializer.save()


class ReportViewSet(viewsets.ViewSet):
    """
    Admin-only report generation endpoints.
    GET /api/reports/excel/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    GET /api/reports/pdf/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    """
    permission_classes = [IsAdmin]

    def _parse_dates(self, request):
        try:
            start_str = request.query_params.get('start_date')
            end_str = request.query_params.get('end_date')
            start = date.fromisoformat(start_str) if start_str else date.today().replace(day=1)
            end = date.fromisoformat(end_str) if end_str else date.today()
        except ValueError:
            return None, None, Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return start, end, None

    @action(detail=False, methods=['get'], url_path='excel')
    def excel(self, request):
        start, end, err = self._parse_dates(request)
        if err:
            return err
        intern_id = request.query_params.get('intern_id')
        return generate_excel_report(start, end, intern_id=intern_id)

    @action(detail=False, methods=['get'], url_path='pdf')
    def pdf(self, request):
        start, end, err = self._parse_dates(request)
        if err:
            return err
        intern_id = request.query_params.get('intern_id')
        return generate_pdf_report(start, end, intern_id=intern_id)
