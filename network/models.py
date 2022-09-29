from django.contrib.auth.models import AbstractUser
from django.db import models
# from django.contrib.auth.signals import user_logged_in, user_logged_out


class User(AbstractUser):
    pass

class Post(models.Model):
    who = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posters")
    content = models.CharField(max_length=255)
    updated = models.DateTimeField(auto_now=True)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)

    def __str__(self):
        return f"who: {self.who} content: {self.content} updated: {self.updated} likes: {self.likes}"

    def serialize(self):
        return {
            "pk" : self.id,
            "user_id": self.who.id,
            "who": self.who.username,
            "content": self.content,
            "updated": self.updated.strftime("%b %d %Y, %I:%M %p"),
            "likes": self.likes,
            "dislikes": self.dislikes
        }


class Follow(models.Model):
    poster = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follows")

    def __str__(self):
        return f"poster: {self.poster}, follower {self.follower}"


# Track Logged in Users
# Ref: https://stackoverflow.com/questions/2723052/how-to-get-the-list-of-the-authenticated-users
# Ref2L https://docs.djangoproject.com/en/4.1/topics/signals/
""" class LoggedUser(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE)

     def __unicode__(self):
     st
        return self.user.username

    def login_user(sender, request, user, **kwargs):
        LoggedUser(user=user).save()

    def logout_user(sender, request, user, **kwargs):
        try:
            u = LoggedUser.objects.get(user=user)
            u.delete()
        except LoggedUser.DoesNotExist:
            pass

    user_logged_in.connect(login_user)
    user_logged_out.connect(logout_user) """
