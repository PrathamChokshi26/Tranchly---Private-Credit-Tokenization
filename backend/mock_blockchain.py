"""Mock Blockchain Layer for Slice Platform

Simulates blockchain operations with database records:
- Mint loan tokens
- Buy tokens (transfer ownership)
- Yield distribution
- Token resale
- Transaction logging with mock tx hashes
"""

import uuid
import secrets
from datetime import datetime, timezone

def generate_tx_hash() -> str:
    """Generate a mock Ethereum-style transaction hash."""
    return "0x" + secrets.token_hex(32)

def generate_wallet_address() -> str:
    """Generate a mock Ethereum wallet address."""
    return "0x" + secrets.token_hex(20)

def generate_block_number() -> int:
    """Generate a mock block number."""
    import random
    return random.randint(50000000, 60000000)

def create_mint_transaction(loan_id: str, token_count: int, token_price: float) -> dict:
    """Create a mock mint transaction record."""
    return {
        "id": str(uuid.uuid4()),
        "tx_hash": generate_tx_hash(),
        "type": "mint",
        "from_address": "0x0000000000000000000000000000000000000000",
        "to_address": "0xSlicePlatformVault",
        "amount": token_count * token_price,
        "block_number": generate_block_number(),
        "network": "polygon",
        "status": "confirmed",
        "metadata": {
            "loan_id": loan_id,
            "token_count": token_count,
            "token_price": token_price,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

def create_buy_transaction(investor_address: str, loan_id: str, token_count: int, amount: float) -> dict:
    """Create a mock token purchase transaction."""
    return {
        "id": str(uuid.uuid4()),
        "tx_hash": generate_tx_hash(),
        "type": "buy",
        "from_address": investor_address,
        "to_address": "0xSlicePlatformVault",
        "amount": amount,
        "block_number": generate_block_number(),
        "network": "polygon",
        "status": "confirmed",
        "metadata": {
            "loan_id": loan_id,
            "token_count": token_count,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

def create_yield_transaction(investor_address: str, amount: float, loan_id: str, repayment_id: str) -> dict:
    """Create a mock yield distribution transaction."""
    return {
        "id": str(uuid.uuid4()),
        "tx_hash": generate_tx_hash(),
        "type": "yield_distribution",
        "from_address": "0xYieldVaultContract",
        "to_address": investor_address,
        "amount": amount,
        "block_number": generate_block_number(),
        "network": "polygon",
        "status": "confirmed",
        "metadata": {
            "loan_id": loan_id,
            "repayment_id": repayment_id,
            "currency": "USDC",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

def create_resale_transaction(seller_address: str, buyer_address: str, token_id: str, amount: float) -> dict:
    """Create a mock token resale transaction."""
    return {
        "id": str(uuid.uuid4()),
        "tx_hash": generate_tx_hash(),
        "type": "resale",
        "from_address": seller_address,
        "to_address": buyer_address,
        "amount": amount,
        "block_number": generate_block_number(),
        "network": "polygon",
        "status": "confirmed",
        "metadata": {
            "token_id": token_id,
            "currency": "USDC",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
