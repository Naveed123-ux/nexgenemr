import getpass
from passlib.context import CryptContext

# It's a good practice to define the hashing context in a central place.
# This ensures you're always using the same hashing settings.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """
    Hashes a password using the bcrypt algorithm.
    Note: bcrypt has a maximum password length of 72 bytes.
    Passlib will handle this, but it's good to be aware of.
    """
    print("password",password)
    return pwd_context.hash(password)

def main():
    """
    Main function to securely get a password and print its hash.
    """
    email = "superadmin@example.com"
    
    # Use getpass to securely prompt for a password without showing it on the screen.
    try:
        password_to_hash = getpass.getpass(f"Enter the password for '{email}': ")
        
        if not password_to_hash:
            print("\nPassword cannot be empty.")
            return
            
        hashed_password = get_password_hash(password_to_hash)
        
        print("\n--- Generated Credentials ---")
        print(f"Email: {email}")
        print(f"Hashed Password: {hashed_password}")
        print("-----------------------------")

    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()
