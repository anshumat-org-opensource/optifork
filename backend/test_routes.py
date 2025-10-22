#!/usr/bin/env python3

import requests
import json

BASE_URL = "http://localhost:8000"

def test_prompt_endpoints():
    print("Testing AI Experiment Prompt Endpoints")
    print("=" * 50)
    
    # Test creating an experiment
    print("\n1. Creating test experiment...")
    experiment_data = {
        "name": "test-experiment-routes", 
        "description": "Test experiment for route testing"
    }
    response = requests.post(f"{BASE_URL}/ai-experiments/", json=experiment_data)
    print(f"Create experiment: {response.status_code}")
    if response.status_code == 200:
        experiment = response.json()
        experiment_id = experiment["id"]
        print(f"Created experiment ID: {experiment_id}")
    else:
        print(f"Failed to create experiment: {response.text}")
        return
    
    # Test creating a prompt config
    print("\n2. Creating prompt config...")
    prompt_data = {
        "name": "test-prompt",
        "prompt_template": "You are a helpful assistant. Answer: {question}",
        "temperature": 0.7,
        "max_tokens": 1000
    }
    response = requests.post(f"{BASE_URL}/ai-experiments/{experiment_id}/prompts", json=prompt_data)
    print(f"Create prompt: {response.status_code}")
    if response.status_code == 200:
        prompt = response.json()
        prompt_id = prompt["id"]
        print(f"Created prompt ID: {prompt_id}")
    else:
        print(f"Failed to create prompt: {response.text}")
        return
    
    # Test getting the prompt config by ID
    print(f"\n3. Getting prompt config {prompt_id}...")
    response = requests.get(f"{BASE_URL}/ai-experiments/prompts/{prompt_id}")
    print(f"Get prompt by ID: {response.status_code}")
    if response.status_code != 200:
        print(f"Failed to get prompt: {response.text}")
    
    # Test updating the prompt config
    print(f"\n4. Updating prompt config {prompt_id}...")
    updated_prompt_data = {
        "name": "test-prompt-updated",
        "prompt_template": "You are a helpful assistant. Answer this question: {question}",
        "temperature": 0.8,
        "max_tokens": 1500
    }
    response = requests.put(f"{BASE_URL}/ai-experiments/prompts/{prompt_id}", json=updated_prompt_data)
    print(f"Update prompt: {response.status_code}")
    if response.status_code != 200:
        print(f"Failed to update prompt: {response.text}")
    
    # Test deleting the prompt config
    print(f"\n5. Deleting prompt config {prompt_id}...")
    response = requests.delete(f"{BASE_URL}/ai-experiments/prompts/{prompt_id}")
    print(f"Delete prompt: {response.status_code}")
    if response.status_code != 200:
        print(f"Failed to delete prompt: {response.text}")
    else:
        print("Prompt deleted successfully!")

if __name__ == "__main__":
    test_prompt_endpoints()