from typing import Protocol

from app.models import Post


class Publisher(Protocol):
    def publish(self, post: Post) -> str:
        ...


class MockPublisher:
    def publish(self, post: Post) -> str:
        return f"/{post.platform}#post-{post.id}"


def get_publisher() -> Publisher:
    return MockPublisher()
