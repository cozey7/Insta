import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

class Browser:
    browser, service = None, None

    def __init__(self, driver: str) -> None:
        self.service = Service(driver)
        self.browser = webdriver.Chrome(service=self.service)

    def open_page(self, url: str):
        self.browser.get(url)

    def close_browser(self):
        self.browser.close()

    def add_input(self, by: By, value: str, text: str):
        field = self.browser.find_element(by=by, value=value)
        field.send_keys(text)
        time.sleep(1)
    
    def click_button(self, by: By, value: str):
        button = self.browser.find_element(by=by, value=value)
        button.click()
        time.sleep(1)

    def login_instagram(self, username: str, password: str):
        self.open_page("https://www.instagram.com")
        time.sleep(2)
        self.add_input(by=By.NAME, value="username", text=username)
        self.add_input(by=By.NAME, value="password", text=password)
        time.sleep(1)

        #Click login button
        self.click_button(by=By.XPATH, value="/html/body/div[2]/div/div/div[2]/div/div/div[1]/section/main/article/div[2]/div[1]/div[2]/form/div/div[3]/button")
    
    def get_followers(self, username: str):
        self.open_page(f"https://www.instagram.com/{username}/")
        time.sleep(3)

        #Click the followers
        self.click_button(by=By.PARTIAL_LINK_TEXT, value="followers")
        time.sleep(1)

        #XPATH of the popup window
        scrollable_list = self.browser.find_element(By.XPATH, "/html/body/div[6]/div[2]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[3]")
        
        #Getting all elements with certain username class
        followers = self.browser.find_elements(by=By.XPATH, value="//span[contains(@class, '_ap3a _aaco _aacw _aacx _aad7 _aade')]")

        #Scrolling through to load more followers
        while True:
            last_count = len(followers)
            self.browser.execute_script("""arguments[0].scrollTop = arguments[0].scrollHeight""", scrollable_list)
            time.sleep(2)  # Add a delay to allow time for the followers to load
            followers = self.browser.find_elements(by=By.XPATH, value="//span[contains(@class, '_ap3a _aaco _aacw _aacx _aad7 _aade')]")
            new_count = len(followers)
            if new_count == last_count:
                break  # Exit the loop if no new followers are loaded
        
        #Convert WebElement list into strings
        for i in range(len(followers)):
            followers[i] = followers[i].text
        
        return followers
    
    def get_following(self, username: str):
        self.open_page(f"https://www.instagram.com/{username}/")
        time.sleep(3)
        self.click_button(by=By.PARTIAL_LINK_TEXT, value="following")
        time.sleep(1)

        scrollable_list = self.browser.find_element(By.XPATH, "/html/body/div[6]/div[2]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[4]")
        
        following = self.browser.find_elements(by=By.XPATH, value="//span[contains(@class, '_ap3a _aaco _aacw _aacx _aad7 _aade')]")

        while True:
            last_count = len(following)
            self.browser.execute_script("""arguments[0].scrollTop = arguments[0].scrollHeight""", scrollable_list)
            time.sleep(2)  # Add a delay to allow time for the followers to load
            following = self.browser.find_elements(by=By.XPATH, value="//span[contains(@class, '_ap3a _aaco _aacw _aacx _aad7 _aade')]")
            new_count = len(following)
            if new_count == last_count:
                break  # Exit the loop if no new followers are loaded
        
        #Convert WebElement list into strings
        for i in range(len(following)):
            following[i] = following[i].text
        
        return following
    
    def print_celebs_fans(self, followers, following):
        followers.sort()
        following.sort()

        celebs = []
        fans = []

        x = 0
        y = 0

        while x < len(followers) and y < len(following):
            if followers[x] < following[y]:
                fans.append(followers[x])
                x+=1
            elif followers[x] > following[y]:
                celebs.append(following[y])
                y+=1
            elif followers[x] == following[y]:
                x+=1
                y+=1
        
        print(f"These are your celebrities:\n{celebs}")
        print(f"These are your fans:\n{fans}")
            


def main() -> None:
    username = input("What is your Instagram username?\n")
    password = input("What is your Instagram password? (This is not a hack)\n")
    print("Checking your ratio now...\n")
    browser = Browser('drivers\chromedriver.exe')
    browser.login_instagram(username, password)
    time.sleep(3)
    followers = browser.get_followers(username)
    following = browser.get_following(username)
    browser.print_celebs_fans(followers, following)
    print(f"You have {len(followers)} followers and {len(following)} following")
    browser.close_browser()
    print("This window will close in 2 minutes. Take a screenshot if needed.")
    time.sleep(120)
    
if __name__ == '__main__':
    main()