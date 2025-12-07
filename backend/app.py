import os
from huggingface_hub import InferenceClient

HF_TOKEN = os.getenv("HF_TOKEN")

conversation = """
Doctor: Good morning, what brings you in today?
Patient: I've been having chest pain since last night.
Doctor: Can you describe the pain?
Patient: It's sharp and gets worse when I breathe deeply. I also feel short of breath.
Doctor: Do you have any other symptoms like cough or fever?
Patient: A mild cough, no fever.
"""

prompt = f"""Convert this doctor-patient conversation into structured SOAP notes in this format:
S (Subjective): [Patient's symptoms]
O (Objective): [Observable findings, if any]
A (Assessment): [Possible diagnoses]
P (Plan): [Next steps and treatment]

Conversation:
{conversation}

SOAP Notes:"""


def generate_soap_notes():
    client = InferenceClient(api_key=HF_TOKEN, timeout=60)

    try:
        print("🔄 Generating SOAP notes with facebook/bart-base...")
        response = client.text_generation(
            prompt=prompt,
            model="facebook/bart-base",
            max_new_tokens=300,
            temperature=0.3,
            return_full_text=False
        )
        print("📦 Raw response from facebook/bart-base:", response)
        return response

    except Exception as e:
        print(f"❌ Error with facebook/bart-base: {e}")

        try:
            print("🔄 Trying fallback model (google/pegasus-xsum)...")
            response = client.text_generation(
                prompt=prompt,
                model="google/pegasus-xsum",
                max_new_tokens=300,
                temperature=0.3,
                return_full_text=False
            )
            print("📦 Raw response from google/pegasus-xsum:", response)
            return response

        except Exception as e2:
            print(f"❌ Error with google/pegasus-xsum: {e2}")
            print("💡 Please check your token, model availability, or try a different model.")
            print("💡 Visit https://huggingface.co/models to find free-tier models.")
            return None


if __name__ == "__main__":
    if not HF_TOKEN:
        print("❌ Please set your Hugging Face token in the HF_TOKEN variable")
        exit(1)

    result = generate_soap_notes()

    if result:
        print("\n" + "=" * 60)
        print("📝 SOAP Notes Generation Raw Output Above")
        print("=" * 60)
    else:
        print("\n❌ Failed to generate SOAP notes. Please check your setup.")
