// Globals
let posts_per_page = Number("10");
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('new-post-form')){
        document.querySelector('#new-post-form').addEventListener('submit', send_post);
    }
    document.querySelector('#all-posts-nav-link').addEventListener('click', () => {
        //alert("about to load posts as All Post nav link is clicked");
        load_posts();
        const username_element = document.getElementById('nav-link-username');
        // if a user is logged in then display new post and all posts.
        if  (typeof(username_element) != 'undefined' && username_element !== null) {
            // alert("setting new post view and post view");
            display_view(new Set(["new-post-view", "posts-view"]));
        }
        else {
           display_view(new Set(["posts-view"]));
        }
    })

    document.querySelector("#next-button").addEventListener('click', () => {
        next_page();
    })

    document.querySelector("#previous-button").addEventListener('click', () => {
        previous_page();
    })

    document.querySelector('#nav-link-following').addEventListener('click', () => {
        const username_element = document.getElementById('nav-link-username');
        // if a user is logged in then display new post and all posts.
        if  (typeof(username_element) != 'undefined' && username_element !== null) {
            load_posts(who = username_element.textContent, following = 1);
            //alert(`Getting the followers for ${username_element.textContent}`);
        }
    })

    // default page behaviour is to load allposts
    load_posts();
}) // DOMContentLoaded

// function create_follow_listener(){document.querySelector('#nav-link-following').addEventListener('click', function () {
//        alert('in following nav link listener');
//        const current_user = document.querySelector('#nav-link-username').textContent;
//        load_posts(current_user, 1);
//   })
//}

// this is the callback function for the "next" button
function next_page(){
    const page_info = get_current_page();
    const current_page_number = page_info.current_page_number;
    const page_list = document.querySelectorAll("div.page");

    // The page_list array indexes are zero based.  Page numbers start at 1.
    page_list[current_page_number - 1].style.display = "none";
    page_list[current_page_number].style.display = "block";

    // set up the navigation buttons correctly.
    post_navigator();
}

// this is the callback function for the "previous" button
function previous_page(){
    //const page_info = get_current_page();
    //const current_page_number = page_info.current_page_number;
    const current_page_number = get_current_page().current_page_number;
    const page_list = document.querySelectorAll("div.page");

    // the page_list array index is zero based.  Page numbers start at 1.
    page_list[current_page_number - 1].style.display = "none";
    page_list[current_page_number - 2].style.display = "block";

    // set up the navigation buttons correctly.
    post_navigator();
}

// Service the document form element to write a new post to the database Post table.
function send_post(event){
    //  alert("Send new post?");
    // Stop the forms default behaviour of sending a HTTP request to server.
    event.preventDefault();

    let send_object = {post: `${document.querySelector('#new-post-content').value}`}
    console.log(send_object);

    fetch('/newpost', {
        method: 'POST',
        body: JSON.stringify(send_object)
    })
        .then(response => response.json())
        .then( result => {
            console.log(`Send Post result is ${result}`);
            //Need to clear the "New Post" view so it is empty.
            const text_area = document.querySelector('#new-post-content');
            text_area.value = "";
            load_posts();  // Update the post to include the post just added.
            display_view(new Set(["new-post-view", "posts-view"]));  // display the correct views.
        });
    return false;
} //send_post


function load_posts(who='', following=0) {
    // alert(`in function load_post(who: ${who}, following: ${following}`)
    let api_url;
    var show_profile = false;
    //For all posts the user_id is 0, for a profile page a user_id > 0.
    if (who === '') {
        //show all posts in data base
        api_url = 'allposts';
    } else if (following === 1) {
        // show all posts the user (the 'who') is following
        api_url = "allposts/" + who + "/" + following
    } else {
        //show only the ones that belong to the profiled user.
        api_url = "allposts/" + who;
        show_profile = true;
    }
    // Call the API to collect all posts or just posts associated with the user clicked on.
    fetch(api_url)
        .then(response => response.json())
        .then(posts => {
            console.log(posts);
            render_posts(posts, show_profile);
            //return false;
        })
}


function get_profile(user_id){
    fetch('profile/' + user_id)
        .then(response => response.json())
        .then(profile_data => {
            update_profile_view(profile_data);
        });
}

function profile(who){
    get_profile(who);
    load_posts(who);
}


// to find if the offered user is the current logged in user by screen scraping the
// element with id nav-link-username.
function is_user_logged_in(who){
    if (document.getElementById('nav-link-username')){
       return (who === document.querySelector('#nav-link-username').textContent);
    }
    return false;  // default
}

// Create the html string for a post.  If is used just to help code readability and
// make it easier to edit what each post looks like. This was use to de-clutter  the 'edit_post'
// function.
function create_post_html(element){
    let html = `
                  <span><a href="#" onclick="profile(\'${element["who"]}\')">${element["who"]}</a></span><br>
                  <span class="content">${element["content"]}</span><br>
                  <span>${element["updated"]} Likes: ${element["likes"]} Dislikes: ${element['dislikes']}</span><br>
    `
    // If the user is logged in, then they need to see an 'edit' anchor on their posts.
    // Moreover, when you click the edit anchor, you want to know which post your
    // are editing.  The id of the anchor contains the integer value of it the Post
    // database primary key. The element can be referred to as 'this' in the callback
    // function.
    if (is_user_logged_in(element["who"])){
        html = html + `
                    <span><a id="pk${element["pk"]}" href="#" onclick="edit_post(this)">edit</a></span>
        `
    }
    // If not the owner of a post, then allow the user at like or dislike a post.
    else {
        html = html + `
                        <span>
                            <a id="like${element['pk']}" href="#" onclick="update_likes(this)">Like</a>     
                            <a id="dislike${element['pk']}" href="#" onclick="update_likes(this)">Dislike</a>
                        </span>
        `
    }
    return html
}

function edit_post(element){
    // Set the primary key of the Post model that will be used to update the content.
    // The 'pk' needs to be removed and the integer key value recovered e.g.
    // 'pk9' will become just the number 9.
    const primary_key = Number((element.id).replace(/^\D*/, ''));
    const post_div = element.closest('div');
    if (element.innerText === "edit") {
        const content_element = post_div.querySelector('span.content');
        const text_area = document.createElement('textarea');
        text_area.className = "editarea";
        text_area.defaultValue = content_element.innerText;
        content_element.parentNode.replaceChild(text_area, content_element);
        element.innerText = "save";
    }
    else {
        console.log("Saving the new content");
        const textarea_element = post_div.querySelector('textarea');
        console.log(`In save: textarea_element.value is: ${textarea_element.value}`);
        const request_options = {
            method: 'POST',
            headers: {'Content-Type' : 'text/plain' },
            body: textarea_element.value
        }
        fetch('update/' + primary_key, request_options)
            .then(response => {
                if (response.ok) {
                    console.log(`${response.statusText}`);
                }
                else {
                    console.log('Error - the post comment update failed');
                }
            })
        // now remove the textarea and replace (restore) it with the <span> element
        const span_element = document.createElement('span');
        span_element.innerText = textarea_element.value;
        span_element.className = 'content';
        textarea_element.parentElement.replaceChild(span_element,textarea_element)
        element.innerText = 'edit';
    }
}

function update_likes(element) {
    // Need to key of the post to update the Post table in the database.
    const primary_key = Number((element.id).replace(/^\D*/, ''));
    const likeability = (element.id).replace(/\d+/, '');
    console.log(`The ${likeability} link was pressed`);
    fetch(`likeability/${primary_key}/${likeability}`)
        .then(response => {
            if (response.ok) {
                console.log(`${response.statusText}`);
                load_posts();
            } else {
                console.log(`${response.statusText}`);
            }
        })
}

function render_posts(post_list, show_profile=false){
    // alert("Entering render posts")
    document.querySelector('#posts-view').style.display = 'block';
    document.querySelector('#posts-view').innerHTML = "";
    let page_div = document.createElement("div");
    let  current_page = "page1"; // The default page
    page_div.id = current_page;  // the first page of posts.
    page_div.className = "page";
    page_div.style.display = "block"; // display the first page.
    let post_count = Number("0");
    post_list.forEach(element => {
        post_count++;
        let last_page = (post_count >= Object.keys(post_list).length) ? true : false;
        let new_page = (post_count % posts_per_page === 0) ? true : false;
        const post_div = document.createElement("div");
        post_div.className = "post";
        // username = element["who"];
        // console.log(`content is ${element["content"]}`);
        //post_div.innerHTML = `<a href="#" onclick="profile(\'${element["who"]}\')">${element["who"]}</a><BR>${element["content"]}<BR>${element["updated"]} Likes: ${element["likes"]} DisLikes ${element["dislikes"}`;
        // console.log(post_div);
        post_div.innerHTML = create_post_html(element);
        page_div.append(post_div);
        console.log(`page_div.is is: ${page_div.id}`);
        if( new_page || last_page ) {
            console.log(`Appending a page, new_page is ${new_page} and last_page is ${last_page}`);
            document.querySelector('#posts-view').append(page_div);
            // set a new page div and hide it by setting its display property to "none".
            if (new_page) {
                page_div = document.createElement('div');
                current_page = "page" + Math.floor((post_count / posts_per_page) + 1 );
                page_div.id = current_page;
                page_div.classList.add("page");
                page_div.style.display = "none";
                //new_page = false;
            }
        }
    })
    post_navigator(show_profile);
}



function post_navigator(show_profile){
    let new_or_profle_view;
    const page_info = get_current_page();
    const number_pages = page_info.number_pages;
    const current_page_number = page_info.current_page_number;
    show_profile ? new_or_profle_view = "profile-view" : new_or_profle_view = "new-post-view";
    // Default is no navigation when there is either no pages or just one page.
    if (number_pages <= 1) {
        // document.querySelector("#post-nav-view").style.display = "none";
        display_view(new Set([new_or_profle_view, "posts-view"]));
        return;
    }

    // Case: If at the first page of more than one then disable the Previous button.
    if (current_page_number === 1) {
        // document.querySelector("#post-nav-view").style.display = "block";
        display_view(new Set([new_or_profle_view, "posts-view", "post-nav-view"]));
        document.querySelector("#previous-button").disabled = true;
        document.querySelector("#next-button").disabled = false;
        console.log("previous button is disabled, next button is okay to go.");
        return undefined;
    }
    // Case: If at the last page of more then one page then disable the Next button.
    if (current_page_number === number_pages) {
        // document.querySelector("#post-nav-view").style.display = "block";
        display_view(new Set([new_or_profle_view, "posts-view", "post-nav-view"]));
        document.querySelector("#previous-button").disabled = false;
        document.querySelector("#next-button").disabled = true;
        console.log("previous button is okay go, next button is disabled");
        return undefined;
    }
    // Case: not on the first or not on the last with two or more pages.
    // document.querySelector("#post-nav-view").style.display = "block";
    display_view(new Set(["new-post-view", "posts-view", "post-nav-view"]));
    document.querySelector("#previous-button").disabled = false;
    document.querySelector("#next-button").disabled = false;
    console.log("Both buttons are okay to go");
    return undefined;
}

function get_current_page(){
    let current_page = Number("0");
    let current_page_number = Number("0");
    const page_list = document.querySelectorAll('div.page');
    page_list.forEach(function(element,index) {
        if (element.style.display === "block"){
            current_page = element.id;
            current_page_number = index + 1;
        }
    })
    return {"number_pages": Number(page_list.length), "current_page_number": current_page_number}
}


function toggle_follow_state(who){
    fetch("togglefollowstate/" + who )
        .then(response => {
            console.log(`statusText is ${response.statusText} and ok is ${response.ok}`);
            profile(who);
        })
    // update the profile-view
}

function update_profile_view(d){
    // alert('update_profile_view');
    const profile_div = document.createElement('div');
    profile_div.innerHTML = `${d['who']} has ${d['followers']} followers and is following ${d['following']} others.`;
    // Clear the profile-view before appending
    document.querySelector("#profile-view").innerHTML = '';
    document.querySelector("#profile-view").append(profile_div);
    // if not an anonymous user and not the post owner then display the 'follow/Unfollow' button.
    // not A and not B === not(A or B)
    if(!(d["is_anonymous"] || d["is_same_user"])) {
        // alert("User is not anonymous and not the same - display follow buttons")
        const follow_button = document.createElement('button');
        follow_button.id = "follow-button";
        follow_button.addEventListener('mousedown', () => {toggle_follow_state(d["who"])});
        follow_button.innerHTML = d["is_follower"] ? "Unfollow" : "Follow";
        document.querySelector("#profile-view").append(follow_button)
    }
    display_view(new Set(['profile-view', 'posts-view']));
    // alert("profile view should be visible");
}

// To make it easier to manage which views in the index.html template are visible or not, the function
// has a argument which is 'Set' of views. The views included in the 'Set' argument are turned  'on'
// (i.e. their display property is set to block) and all other views 'off' (i.e. their display property is
// set to none).
// Example call to function:
//                 display_view(new Set(["new-post-view", "posts-view"])
//
function display_view(view_set){
    // Use the following constants to keep the code line width under 120 characters wide.
    // This makes the code easier to read.
    const new_post_view = document.querySelector("#new-post-view");
    const profile_view = document.querySelector("#profile-view");
    const posts_view = document.querySelector("#posts-view");
    const post_nav_view = document.querySelector("#post-nav-view");
    const edit_view = document.querySelector("#edit-view");

    // Enable the views included in the view_set parameter.
    // The new-post-view is only in the document if the user is logged in.  Need to test for this otherwise
    // you will throw a null object error as the new-post-element will be null when not include in the
    // index.html template
    if  (typeof(new_post_view) != undefined &&  new_post_view !== null) {
        view_set.has("new-post-view") ? new_post_view.style.display = 'block' : new_post_view.style.display = 'none';
    }
    view_set.has("profile-view") ? profile_view.style.display = 'block' : profile_view.style.display = 'none';
    view_set.has("posts-view") ? posts_view.style.display = 'block': posts_view.style.display = 'none';
    view_set.has("post-nav-view") ? post_nav_view.style.display = 'block' : post_nav_view.style.display = 'none';
    view_set.has("edit-view") ? edit_view.style.display = 'block' : edit_view.style.display = 'none';
}