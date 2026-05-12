import os
import subprocess
import sys
import signal
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

port = os.environ.get('PORT') or '8080'
logging.info(f"Starting services on port {port}")
logging.info(f"DATABASE_URL set: {bool(os.environ.get('DATABASE_URL'))}")
logging.info(f"BOT_TOKEN set: {bool(os.environ.get('BOT_TOKEN'))}")

proc_web = subprocess.Popen([
    'gunicorn', 'web.app:app',
    '--bind', f'0.0.0.0:{port}',
    '--workers', '1',
    '--timeout', '120',
    '--log-level', 'info'
])

proc_bot = subprocess.Popen([sys.executable, '-m', 'bot.main'])

def shutdown(signum, frame):
    logging.info("Shutting down...")
    proc_web.terminate()
    proc_bot.terminate()
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

proc_web.wait()
proc_bot.wait()
