import os
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY is not set")
    exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

print("Listing available models...\n")

try:
    models = client.models.list()
    
    print("Available models:")
    print("=" * 80)
    
    for model in models:
        print(f"\nModel: {model.name}")
        print(f"Display Name: {model.display_name}")
        print(f"Description: {model.description}")
        if hasattr(model, 'supported_generation_methods'):
            print(f"Supported methods: {model.supported_generation_methods}")
        print("-" * 80)
        
except Exception as e:
    print(f"Error listing models: {e}")