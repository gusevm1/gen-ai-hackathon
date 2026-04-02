"""Quick Apply router -- submits contact messages to Flatfox listings."""

import logging
import re

import requests
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class QuickApplyRequest(BaseModel):
    listing_id: str
    name: str
    email: str
    phone: str
    message: str


class QuickApplyResponse(BaseModel):
    success: bool
    error: str | None = None


@router.post("/quick-apply", response_model=QuickApplyResponse)
def quick_apply(req: QuickApplyRequest):
    """Submit a contact message to a Flatfox listing.

    1. GET the listing page to extract CSRF token from HTML
    2. POST the contact form with CSRF + Referer
    """
    listing_url = f"https://flatfox.ch/de/flat/{req.listing_id}/"

    try:
        session = requests.Session()

        # Step 1: Fetch listing page for CSRF token
        page_resp = session.get(listing_url, timeout=15)
        page_resp.raise_for_status()

        # Extract CSRF token -- Flatfox embeds it in a meta tag or hidden input
        csrf_match = re.search(
            r'name=["\']csrfmiddlewaretoken["\'] value=["\']([^"\']+)["\']',
            page_resp.text,
        )
        if not csrf_match:
            # Also try meta tag pattern
            csrf_match = re.search(
                r'<meta name=["\']csrf-token["\'] content=["\']([^"\']+)["\']',
                page_resp.text,
            )
        if not csrf_match:
            logger.error("CSRF token not found in listing page HTML")
            return QuickApplyResponse(success=False, error="Could not extract CSRF token from listing page")

        csrf_token = csrf_match.group(1)

        # Step 2: POST the contact form
        contact_url = f"https://flatfox.ch/de/flat/{req.listing_id}/contact/"
        form_data = {
            "csrfmiddlewaretoken": csrf_token,
            "first_name": req.name,
            "email": req.email,
            "phone": req.phone,
            "body": req.message,
        }
        headers = {
            "Referer": listing_url,
        }

        post_resp = session.post(contact_url, data=form_data, headers=headers, timeout=15)

        if post_resp.status_code in (200, 201, 302):
            return QuickApplyResponse(success=True)
        else:
            logger.warning(f"Flatfox contact POST returned {post_resp.status_code}: {post_resp.text[:200]}")
            return QuickApplyResponse(success=False, error=f"Flatfox returned status {post_resp.status_code}")

    except requests.Timeout:
        return QuickApplyResponse(success=False, error="Flatfox request timed out")
    except requests.RequestException as e:
        logger.error(f"Quick apply request failed: {e}")
        return QuickApplyResponse(success=False, error="Failed to contact Flatfox")
    except Exception as e:
        logger.error(f"Unexpected error in quick_apply: {e}")
        return QuickApplyResponse(success=False, error="Unexpected error occurred")
