from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("", views.index, name="index"),
    path("upload/", views.upload, name="upload"),
    path("sample/", views.load_sample, name="sample"),
    path("clear/", views.clear, name="clear"),
    path("dashboard/", views.dashboard, name="dashboard"),
]
