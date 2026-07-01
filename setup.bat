@echo off
echo ============================
echo  DebriefPro Setup Script
echo ============================

echo.
echo [1/4] Creating Python virtual environment and installing dependencies...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo [2/4] Running Django migrations...
python manage.py makemigrations
python manage.py migrate

echo.
echo [3/4] Creating Django superuser (admin)...
echo from users.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@debriefpro.com', 'Admin@1234', role='ADMIN', first_name='Admin', last_name='User') | python manage.py shell

echo.
echo [4/4] Installing frontend dependencies...
cd ..\frontend
npm install

echo.
echo ============================
echo  Setup Complete!
echo ============================
echo.
echo To start the backend:
echo   cd backend
echo   venv\Scripts\activate
echo   python manage.py runserver
echo.
echo To start the frontend (in a separate terminal):
echo   cd frontend
echo   npm run dev
echo.
echo Default admin credentials:
echo   Username: admin
echo   Password: Admin@1234
echo.
pause
