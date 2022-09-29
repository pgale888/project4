import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from django.core import serializers

from .models import User, Post, Follow


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


@csrf_exempt
# @login_required
def newpost(request):
    # create a User object instead of using SimpleLazyObject returned by request.user
    user = User.objects.get(pk=int(request.user.id))

    # To add a new post to the network it must be via a POST request
    if request.method != 'POST':
        return JsonResponse({"error": "POST request required to add new post"})

    form_data = json.loads(request.body)
    # Debug Line: Take a look at the data sent to the API
    print(f"form_data is: {form_data}")

    # The update field is auto updated on the .save operation and the 'likes' field is default to 0.
    post_data = Post(
        who=user,
        content=form_data["post"]
    )

    post_data.save()
    return JsonResponse({"message": "The new post is successful"})


# API requests
def allposts(request, who='', following=0):
    # get a queryset of all posts by default is no user_id is offered
    if who == '':
        all_posts = Post.objects.order_by('-updated').all()
    else:
        if following:  # if following is a '1' i.e True
            # gather all posts the given user is following,
            current_user = User.objects.get(pk=request.user.id)
            current_user_following = current_user.follows.all()
            # print(f"The current user: {current_user.username} following set is: {current_user_following}")
            # Filters where the who_id in the Post model matches the poster_id in the Follow model. Do remember
            # that Post: who is a User Object and that Follow:poster is a User Object.
            all_posts = Post.objects.filter(who_id__in=current_user_following.values('poster_id'))
        else:
            # gather all posts associate with the given user.
            print(f"filtering posts for user: {who}")
            all_posts = Post.objects.order_by("-updated").filter(who__username=who)
    # Covert the querySet to a list to pass to the JsonResponse
    all_posts_list = [post.serialize() for post in all_posts]
    # print(all_posts_list)  # For debugging
    return JsonResponse(all_posts_list, safe=False)


def follow(request, user_id):
    # print(f"request.user is: {request.user}")
    number_followers = Follow.objects.filter(poster=user_id).count()
    number_following = Follow.objects.filter(follower=user_id).count()
    is_follower = Follow.objects.filter(poster=user_id, follower=request.user.id).exists()
    profiled_user = User.objects.get(pk=user_id).username
    # print(f"number_followers: {number_followers}   number_following: {number_following} "
    #      f" who: {profiled_user}")
    follow_data = {"number_followers": number_followers,
                   "number_following": number_following,
                   "who": profiled_user,
                   "request_username": request.user.username,
                   "is_follower": is_follower}
    return JsonResponse(follow_data, safe=False)


# toggle the follow state and return the state of the follow table.
def togglefollowstate(request, poster):
    poster_user = User.objects.get(username=poster)
    follower_user = User.objects.get(pk=request.user.id)
    print(f"follower is: {follower_user.username} and poster.id is {poster_user.id}")
    # Toggle: If the current user is following the 'poster' user then remove as a follower,
    # else add the current user as a follower of the 'poster' user.
    if Follow.objects.filter(poster=poster_user.id, follower=follower_user.id).exists():
        print(f"About to delete object where poster is {poster_user.username} and follower is {follower_user.username}")
        Follow.objects.filter(poster=poster_user.id, follower=follower_user.id).delete()
    else:
        print(f"about to create Follow table entry poster {poster_user.username} and follower {follower_user.username}")
        add_follower = Follow.objects.create(poster=poster_user, follower=follower_user)
        add_follower.save()
    # print(f"follow_state to be returned is: {follow_state}")
    # return JsonResponse(follow_state, safe=False)
    return HttpResponse(status=204)


def profile(request, who):
    # print(f"request.user is: {request.user}")
    profiled_user = User.objects.get(username=who)
    # deal with anonymous users
    request_user = 'anonymous'if request.user.is_anonymous else request.user.username
    followers = Follow.objects.filter(poster=profiled_user.id).count()
    following = Follow.objects.filter(follower=profiled_user.id).count()
    is_same_user = True if request_user == who else False
    # will the following line work if the user is anonymous?
    is_follower = Follow.objects.filter(poster=profiled_user.id, follower=request.user.id).exists()
    profile_data = {"followers": followers,
                    "following": following,
                    "who": profiled_user.username,
                    "user_id": profiled_user.id,
                    "request_user": request_user,
                    "is_anonymous": request.user.is_anonymous,
                    "is_follower": is_follower,
                    "is_same_user": is_same_user,
                    }
    # print(f"profile_data is: {profile_data}")
    return JsonResponse(profile_data, safe=False)

@csrf_exempt
def update(request, pk):
    if request.method == "POST":
        print(f"request.body is {request.body.decode('ascii')}")
        post = Post.objects.get(pk=pk)
        post.content = request.body.decode('ascii')  # Convert from byte encoding.
        post.save(update_fields=['content'])
    else:
        print("No Post received")
        return HttpResponse(status=500)
    return HttpResponse(status=204)


def likeability(request, pk, likeability):
    post = Post.objects.get(pk=pk)
    if likeability == "like":
        post.likes = F('likes') + 1
        post.save(update_fields=['likes'])
    elif likeability == "dislike":
        post.dislikes = F('dislikes') + 1
        post.save(update_fields=['dislikes'])
    else:
        print(f"likeability is {likeability}, it should be 'like' or 'dislike'")
        return HttpResponse(status=500)
    return HttpResponse(status=204)
