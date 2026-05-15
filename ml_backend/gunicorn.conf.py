import multiprocessing

# Bind to 0.0.0.0 for Docker networking
bind = "0.0.0.0:8000"

# Using standard sync workers. 
# Do NOT use gevent/eventlet for heavy PyTorch workloads.
worker_class = "sync"

# 1 worker is ideal for 512MB RAM free-tier limits.
# If you upgrade your server, formula is: multiprocessing.cpu_count() * 2 + 1
workers = 1 

# High timeout because TTA + GradCAM + CPU inference can take 2-5 seconds
timeout = 120

# Memory management: Restart worker after 50 requests to prevent memory leaks over time
max_requests = 50
max_requests_jitter = 10

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"