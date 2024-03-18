# Use the official Python image as base image
FROM python:3.9 AS base

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY venv/requirements.txt ./
RUN pip install --upgrade pip

RUN pip install -r requirements.txt

# Copy the rest of the application code
COPY . ./

# Expose the Flask port
EXPOSE 5000

# Run the Flask application
CMD ["python", "app.py"]
