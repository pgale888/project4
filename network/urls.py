from django.urls import path, re_path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API Routes
    path("newpost", views.newpost, name="newpost"),
    path("allposts", views.allposts, name="allposts"),
    path("allposts/<str:who>", views.allposts),
    re_path(r'^allposts/(?P<who>[\w]+)/(?P<following>[0-1])', views.allposts),
    path("follow/<int:user_id>", views.follow, name="follow"),
    path("togglefollowstate/<str:poster>", views.togglefollowstate, name="followstate"),
    path("profile/<str:who>", views.profile, name="profile"),
    path("update/<int:pk>", views.update, name="update"),
    path("likeability/<int:pk>/<str:likeability>", views.likeability, name="likeability"),
]
