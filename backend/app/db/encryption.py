"""
Credential encryption utilities for Marzban-Manager.

Uses AES-256-GCM encryption for storing sensitive credentials.
"""

import os
import base64
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class CredentialEncryption:
    """
    AES-256-GCM encryption for sensitive credentials.
    
    Usage:
        encryptor = CredentialEncryption()
        
        # Encrypt a password
        encrypted = encryptor.encrypt("my_secret_password")
        
        # Store encrypted (bytes) in database BYTEA column
        
        # Decrypt when needed
        password = encryptor.decrypt(encrypted)
    """
    
    # Nonce size for AES-GCM (96 bits = 12 bytes is recommended)
    NONCE_SIZE = 12
    
    # Salt size for key derivation
    SALT_SIZE = 16
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize the encryption handler.
        
        Args:
            encryption_key: Base64-encoded 32-byte key, or derived from ENCRYPTION_KEY env var
        """
        self._key = self._get_or_derive_key(encryption_key)
        self._aesgcm = AESGCM(self._key)
    
    def _get_or_derive_key(self, encryption_key: Optional[str]) -> bytes:
        """
        Get encryption key from parameter or environment.
        
        If ENCRYPTION_KEY is a passphrase (not 32 bytes), derives a key using PBKDF2.
        
        Args:
            encryption_key: Optional base64-encoded key or passphrase
            
        Returns:
            32-byte encryption key
        """
        key_source = encryption_key or os.environ.get("ENCRYPTION_KEY")
        
        if not key_source:
            raise ValueError(
                "Encryption key not provided. Set ENCRYPTION_KEY environment variable "
                "or pass encryption_key parameter."
            )
        
        # Try to decode as base64
        try:
            decoded = base64.b64decode(key_source)
            if len(decoded) == 32:
                return decoded
        except Exception:
            pass
        
        # Treat as passphrase and derive key
        # Use a fixed salt for deterministic key derivation
        # In production, consider using a unique salt per installation
        salt = b"marzban-manager-salt-v1"
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,  # OWASP recommended minimum
        )
        
        return kdf.derive(key_source.encode("utf-8"))
    
    def encrypt(self, plaintext: str) -> bytes:
        """
        Encrypt a string value.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            Encrypted bytes (nonce + ciphertext) suitable for BYTEA storage
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty value")
        
        # Generate random nonce
        nonce = os.urandom(self.NONCE_SIZE)
        
        # Encrypt
        ciphertext = self._aesgcm.encrypt(
            nonce,
            plaintext.encode("utf-8"),
            None  # No additional authenticated data
        )
        
        # Return nonce + ciphertext
        return nonce + ciphertext
    
    def decrypt(self, encrypted: bytes) -> str:
        """
        Decrypt an encrypted value.
        
        Args:
            encrypted: Encrypted bytes (nonce + ciphertext) from database
            
        Returns:
            Decrypted string
        """
        if not encrypted or len(encrypted) <= self.NONCE_SIZE:
            raise ValueError("Invalid encrypted data")
        
        # Extract nonce and ciphertext
        nonce = encrypted[:self.NONCE_SIZE]
        ciphertext = encrypted[self.NONCE_SIZE:]
        
        # Decrypt
        plaintext = self._aesgcm.decrypt(nonce, ciphertext, None)
        
        return plaintext.decode("utf-8")
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new random encryption key.
        
        Returns:
            Base64-encoded 32-byte key suitable for ENCRYPTION_KEY env var
        """
        key = os.urandom(32)
        return base64.b64encode(key).decode("utf-8")


# Singleton instance for application-wide use
_encryption_instance: Optional[CredentialEncryption] = None


def get_encryptor() -> CredentialEncryption:
    """
    Get the application-wide encryption instance.
    
    Returns:
        CredentialEncryption instance
    """
    global _encryption_instance
    
    if _encryption_instance is None:
        _encryption_instance = CredentialEncryption()
    
    return _encryption_instance


def reset_encryptor() -> None:
    """Reset the encryption instance (useful for testing)."""
    global _encryption_instance
    _encryption_instance = None
