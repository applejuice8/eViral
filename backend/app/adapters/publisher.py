"""Publishers send a post to a social platform.

Only a mock exists for the prototype: it marks the post as sent and
returns a link to our own demo page for that platform.
"""

from typing import Protocol

from app.models import Post


class Publisher(Protocol):
    def publish(self, post: Post) -> str:
        """Send the post; return its public URL."""
        ...


class MockPublisher:
    def publish(self, post: Post) -> str:
        return f"/{post.platform}#post-{post.id}"


def get_publisher() -> Publisher:
    """FastAPI dependency; override in tests if needed."""
    return MockPublisher()
