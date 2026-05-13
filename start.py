import os, sys, subprocess, signal, logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

port = os.environ.get('PORT', '8080')
log.info(f"=== INVEST BOT STARTING on port {port} ===")

procs = []

def run():
    global procs
    p1 = subprocess.Popen([sys.executable, '-m', 'gunicorn',
        'web.app:app', '--bind', f'0.0.0.0:{port}',
        '--workers', '1', '--timeout', '120'])
    p2 = subprocess.Popen([sys.executable, '-m', 'bot.main'])
    procs = [p1, p2]
    log.info(f"Web: PID={p1.pid}, Bot: PID={p2.pid}")
    p1.wait()

def stop(sig, frame):
    for p in procs:
        try: p.terminate()
        except: pass
    sys.exit(0)

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
run()
