import pytest
from functions.technologies.libs.result import Result

def test_success():
    r = Result(status="success")
    assert r.success() == True
    assert r.failure() == False

def test_failure():
    r = Result(errors=["some error"])
    assert r.success() == False
    assert r.failure() == True

def test_default_status():
    r = Result()
    assert r.status == "ok"
    assert r.success() == True
    assert r.failure() == False

def test_custom_status():
    r = Result(status="custom")
    assert r.status == "custom"
    assert r.success() == True
    assert r.failure() == False

def test_result():
    r = Result(result="some result")
    assert r.result == "some result"

def test_errors():
    r = Result(errors=["some error"])
    assert r.errors == ["some error"]
