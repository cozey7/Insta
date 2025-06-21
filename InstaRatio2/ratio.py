import instaloader

L = instaloader.Instaloader()
#L.login(USER, PASSWORD)        # (login)
L.interactive_login(USERNAME)      # (ask password on terminal)
#L.load_session_from_file(USER) # (load session created w/
                               #  `instaloader -l USERNAME`)
# Login (optional but useful for private data or higher rate limits)
# L.login('your_username', 'your_password')

# Load profiles
profile = instaloader.Profile.from_username(L.context, USERNAME)
followers = profile.get_followers()
followees = profile.get_followees()

print("Followers:", followers)
#print("Bio:", profile.biography)