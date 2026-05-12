import os
import subprocess
import sys
import signal

port = os.environ.get('PORT', '8080')

proc_web = subprocess.Popen([
    'gunicorn', 'web.app:app',
    '--bind', f'0.0.0.0:{port}',
    '--workers', '1',
    '--timeout', '120'
])

proc_bot = subprocess.Popen([sys.executable, '-m', 'bot.main'])

def shutdown(signum, frame):
    proc_web.terminate()
    proc_bot.terminate()
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

proc_web.wait()
proc_bot.wait()
