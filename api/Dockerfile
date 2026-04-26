FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run seed script before starting the server
CMD ["sh", "-c", "python /app/seed_on_start.py && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"]
