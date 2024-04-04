# FROM python:3.9-slim-buster

# WORKDIR /app

# COPY requirements.txt requirements.txt

# RUN pip3 install -r requirements.txt

# COPY . .

# CMD [ "python3", "-m", "flask", "run", "--host=0.0.0.0" ]

FROM python:3.11.7-bullseye

RUN apt-get update && apt-get install -y libgl1-mesa-glx

WORKDIR /app

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip 

COPY . /app
RUN pip install --no-cache-dir tensorflow
EXPOSE 5000

CMD ["python", "app.py"]
