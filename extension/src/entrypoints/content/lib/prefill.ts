/**
 * Prefill the Flatfox contact form when opened via HomeMatch Quick Apply.
 *
 * The web app encodes {name, email, phone, message} as a JSON string in the
 * `homematch_apply` URL query parameter. This module reads that param,
 * waits for the contact form fields to appear in the DOM (they may be inside
 * a modal that opens on user interaction), and fills them automatically.
 */

interface PrefillData {
  name: string
  email: string
  phone: string
  message: string
}

/**
 * Set a form field value in a way that fires both native and React-compatible
 * change events, so the page's JS recognises the new value.
 */
function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Attempt to find and fill the contact form fields.
 * Returns true if at least one field was found and filled.
 */
function tryFill(data: PrefillData): boolean {
  const firstName = document.querySelector<HTMLInputElement>('input[name="first_name"]')
  const email     = document.querySelector<HTMLInputElement>('input[name="email"]')
  const phone     = document.querySelector<HTMLInputElement>('input[name="phone"]')
  const body      = document.querySelector<HTMLTextAreaElement>('textarea[name="body"]')

  // Only fill if we can find at least the message body or name field
  if (!body && !firstName) return false

  if (firstName) setFieldValue(firstName, data.name)
  if (email)     setFieldValue(email, data.email)
  if (phone)     setFieldValue(phone, data.phone)
  if (body)      setFieldValue(body, data.message)

  console.log('[HM] prefill: contact form filled')
  return true
}

/**
 * Call once from the content script entry point.
 * Reads `homematch_apply` from the current URL, decodes the prefill data,
 * and fills the contact form as soon as it appears in the DOM.
 */
export function activatePrefill() {
  const params  = new URLSearchParams(window.location.search)
  const encoded = params.get('homematch_apply')
  if (!encoded) return

  let data: PrefillData
  try {
    // URLSearchParams.get() already percent-decodes, so parse directly
    data = JSON.parse(encoded) as PrefillData
  } catch {
    console.warn('[HM] prefill: failed to parse homematch_apply param')
    return
  }

  // Try immediately (form might already be in the DOM on page load)
  if (tryFill(data)) return

  // Otherwise observe DOM mutations — the form may be inside a modal that
  // opens when the user (or the page) interacts with a contact button.
  const observer = new MutationObserver(() => {
    if (tryFill(data)) {
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // Safety cleanup after 60 s to avoid leaking the observer indefinitely
  setTimeout(() => observer.disconnect(), 60_000)
}
