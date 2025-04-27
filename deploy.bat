@echo off
setlocal

echo Deploying Pilot Dashboard...

:: Define server info
set SERVER_USER=luke
set SERVER_IP=192.168.3.8
set SERVER_PATH=/var/www/pilot-dashboard

:: Local path (adjust if necessary)
set LOCAL_PATH=C:/Users/speak up/Documents/_programming/PilotDashboard/

:: Upload files using SCP
echo Uploading files...
scp -r "%LOCAL_PATH%." %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%

:: (Optional) Fix permissions remotely
echo Fixing permissions...
ssh %SERVER_USER%@%SERVER_IP% "sudo chown -R www-data:www-data /var/www/pilot-dashboard && sudo chmod -R 755 /var/www/pilot-dashboard"

echo Deployment complete!

pause
