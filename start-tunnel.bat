@echo off
title Kiosk Public HTTPS Tunnel
echo ========================================================
echo Starting Public HTTPS Tunnel for AI Digital Standee Kiosk
echo Forwarding local port 5173 to public HTTPS via SSH
echo ========================================================
ssh -R 80:127.0.0.1:5173 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 nokey@localhost.run
pause
