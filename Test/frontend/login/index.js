// Import the puppeteer library
import puppeteer from 'puppeteer';
import config from '../../config.json' with { type: "json" };
import { fileURLToPath } from 'url';
import path from 'path'
import fs from 'fs'
/**
 * Logs into a web application and verifies the login API response.
 * @param {string} email - The email to use for login.
 * @param {string} password - The password to use for login.
 * @returns {Promise<boolean>} - Returns true if the login API response has an access_token, otherwise false.
 */
function createRandomEmail() {
    const randomString = Math.random().toString(36).substring(2, 12);
    return `doctor.${randomString}@clinic-test.com`;
}
async function selectCustomDropdown(page, triggerText, optionText) {
    // 1. Find and click the dropdown trigger button by its placeholder text
    const triggerXPath = `//button[.//span[text()='${triggerText}']]`;
    // Use the new syntax for waiting for an XPath
    const trigger = await page.waitForSelector(`xpath/${triggerXPath}`);
    if (!trigger) throw new Error(`Dropdown trigger with text "${triggerText}" not found.`);
    await trigger.click();
    console.log(`Clicked dropdown: "${triggerText}"`);

    // 2. Wait for the option to appear and click it by its text
    const optionXPath = `//div[@role="option" and normalize-space()="${optionText}"]`;
    // Use the new syntax here as well
    const option = await page.waitForSelector(`xpath/${optionXPath}`, { visible: true });
    if (!option) throw new Error(`Option with text "${optionText}" not found.`);
    await option.click();
    console.log(`Selected option: "${optionText}"`);
}
async function loginAndVerify(email, password) {
    console.log('Launching browser...');
    // Launch a new browser instance. 'headless: false' lets you see the browser UI.
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    try {
        // This promise will resolve or reject based on the login API call.
        const loginApiResponse = new Promise((resolve, reject) => {
            // Set up a listener for all network responses
            page.on('response', async (response) => {
                // Check if the response URL is the one we want and the method is POST.
                // This avoids trying to parse JSON from other requests (like OPTIONS pre-flight).
                if (response.url().includes(config.loginApiUrl) && response.request().method() === 'POST') {
                    console.log(`Intercepted POST API response from: ${response.url()}`);
                    try {
                        const responseBody = await response.json();
                        console.log('API Response Body:', responseBody);

                        // Check for the "access_token" field in the response to confirm success.
                        if (responseBody.access_token) {
                            console.log('Login successful, access_token found.');
                            resolve(true);
                        } else {
                            console.log('Login failed, access_token not found.');
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('Failed to parse JSON from response:', error);
                        reject('Could not parse API response.');
                    }
                }
            });

            // Set a timeout to fail the function if the API response isn't received
            setTimeout(() => {
                reject(new Error('Timeout: Did not receive a login API response in 15 seconds.'));
            }, 15000);
        });


        console.log(`Navigating to ${config.devUrlFrontend}...`);
        await page.goto(config.devUrlFrontend, { waitUntil: "domcontentloaded" });

        console.log('Filling out the form...');
        await page.type('#email', email);
        await page.type('#password', password);

        console.log('Submitting the form...');
        // Click the submit button to trigger the API call
        await page.click('button[type="submit"]');

        // Wait for the promise to resolve (i.e., for the response listener to do its job)
        const isLoginSuccessful = await loginApiResponse;

        if (isLoginSuccessful) {
            console.log('Verification successful! The function will return true.');
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.screenshot({ path: 'login-success.png' });

            // Wait a moment to see the logged-in screen
            const linkSelector = 'a[href="/hospital-admin/addStaff"]';
            // Wait for the link to appear and then click it
            await page.waitForSelector(linkSelector);
            await page.click(linkSelector);
            await new Promise(resolve => setTimeout(resolve, 3000));
            const doctorEmail = createRandomEmail();
            console.log(`Generated random email: ${doctorEmail}`);

            // --- Step 2: Fill in the standard text fields ---
            console.log('📝 Filling in text fields...');
            await page.type('#firstName', 'Eleanor');
            await page.type('#lastName', 'Vance');
            await page.type('#email', doctorEmail);
            await page.type('#deaNumber', 'AV1234567');
            await page.type('#npi', '1234567890');
            await page.type('#qualifications', 'MD, PhD');
            await page.type('#medicalLicense', 'GMC-12345');
            await page.type('#biography', 'Dr. Vance is a renowned cardiologist with over a decade of experience.');

            // --- Step 3: Handle the Custom "TagsInput" for languages ---
            console.log('🗣️ Adding languages...');
            const languages = ['English', 'Spanish'];
            const tagsInputSelector = 'input[placeholder="English, Spanish, etc."]';
            await page.waitForSelector(tagsInputSelector);
            for (const lang of languages) {
                await page.type(tagsInputSelector, lang);
                await page.keyboard.press('Enter');
                console.log(`Added language: ${lang}`);
                await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
            }

            // --- Step 4: Handle the custom dropdowns (Selects) ---
            console.log('👇 Selecting from dropdowns...');
            await selectCustomDropdown(page, 'Select Department', 'Cardiology');
            await selectCustomDropdown(page, 'Select Specialization', 'Cardiac');
            await selectCustomDropdown(page, 'Select Years', '2');

            // --- Step 5: Handle the file upload ---
            console.log('📂 Starting file upload process...');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const filePath = path.join(__dirname, 'logo.png');

            // 1. VERIFY FILE EXISTS
            console.log(`Checking for file at path: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found at path: ${filePath}. Make sure 'logo.png' is in the same directory as your script.`);
            }
            console.log('✅ File exists.');

            // 2. FIND THE FILE INPUT ELEMENT
            const fileInput = await page.waitForSelector('input[type="file"]', { visible: false }); // It's okay if it's hidden
            if (!fileInput) throw new Error('Could not find the file input element on the page.');
            console.log('✅ File input element found.');

            // 3. UPLOAD THE FILE
            await fileInput.uploadFile(filePath);
            console.log('Sent upload command.');

            // 4. VERIFY THE UPLOAD IN THE BROWSER'S DOM
            // This is the most important check. We ask the browser if the file input now has a file.
            const filesAttached = await page.$eval('input[type="file"]', (input) => input.files.length);

            if (filesAttached > 0) {
                console.log(`✅ Verification successful! Browser reports ${filesAttached} file(s) attached.`);
            } else {
                throw new Error('❌ Verification failed! The file was not attached to the input element.');
            }

            console.log('Logo file selected.');

            // --- Step 6: Check the checkbox ---
            console.log('✅ Checking the telehealth checkbox...');
            await page.click('#availableForTelehealth');

            // --- Step 7: Submit the form ---
            console.log('📤 Submitting the form...');
            await page.click('button[type="submit"]');

            // --- Step 8: Wait to observe the result ---
            console.log('🎉 Form submitted successfully! Waiting for 10 seconds.');
            await new Promise(resolve => setTimeout(resolve, 10000));
            await page.screenshot({ path: 'doctor-created-success.png' });


            const staffbuttonXPath = "//button[normalize-space()='Staff']";

            // Wait for the button to be available and then click it
            const button_staff = await page.waitForSelector(`xpath/${staffbuttonXPath}`);
            await button_staff.click();
            await new Promise(resolve => setTimeout(resolve, 2000));

            const staffEmail = createRandomEmail();
            console.log(`Generated random email: ${staffEmail}`);

            // --- Step 2: Fill in the standard text fields ---
            console.log('📝 Filling in text fields...');
            await page.type('#first_name', 'Alex');
            await page.type('#last_name', 'Chen');
            await page.type('#email', staffEmail);

            // --- Step 3: Handle the custom dropdown for Job Title ---
            console.log('👇 Selecting from dropdown...');
            await selectCustomDropdown(page, 'Select job_title', 'receptionist');

         

            console.log(`Checking for file at path: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found at path: ${filePath}. Make sure 'logo.png' is in the same directory.`);
            }
            console.log('✅ File exists.');

            const fileInput_1 = await page.waitForSelector('input[type="file"]');
            await fileInput_1.uploadFile(filePath);
            console.log('Sent upload command.');

            const filesAttached_1 = await page.$eval('input[type="file"]', (input) => input.files.length);
            if (filesAttached_1 > 0) {
                console.log(`✅ Verification successful! Browser reports ${filesAttached_1} file(s) attached.`);
            } else {
                throw new Error('❌ Verification failed! The file was not attached to the input element.');
            }

            // --- Step 5: Submit the form ---
            console.log('📤 Submitting the form...');
            const submitButton = await page.waitForSelector("button[type='submit']");
            await submitButton.click();

            // --- Step 6: Wait to observe the result ---
            console.log('🎉 Form submitted successfully! Waiting for 10 seconds.');
            await new Promise(resolve => setTimeout(resolve, 10000));
            await page.screenshot({ path: 'staff-created-success.png' });
            console.log('📸 Screenshot saved as staff-created-success.png');




            const staffLinkSelector = 'a[href="/hospital-admin/staff"]';




            // Wait for the link to appear and then click it
            await page.waitForSelector(staffLinkSelector);
            await page.click(staffLinkSelector);
            await new Promise(resolve => setTimeout(resolve, 3000));

            await page.screenshot({ path: 'staff-page-success.png' });
            const button_staff_second_p = await page.waitForSelector(`xpath/${staffbuttonXPath}`);
            await button_staff_second_p.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ path: 'doctors-page-success.png' });





            const departmentLinkSelector = 'a[href="/hospital-admin/departments"]';

            // Wait for the link to appear and then click it
            await page.waitForSelector(departmentLinkSelector);
            await page.click(departmentLinkSelector);
            await new Promise(resolve => setTimeout(resolve, 3000));

            await page.screenshot({ path: 'departments-page-success.png' });

            const auditLogsSelector = 'a[href="/hospital-admin/audit-log"]';

            // Wait for the link to appear and then click it
            await page.waitForSelector(auditLogsSelector);
            await page.click(auditLogsSelector);
            await new Promise(resolve => setTimeout(resolve, 10000));
            await page.screenshot({ path: 'audit-logs-success.png' });

            console.log('📸 Screenshot saved as doctor-created-success.png');
        } else {
            console.log('Verification failed. The function will return false.');
        }

        return isLoginSuccessful;

    } catch (error) {
        console.error('An error occurred during the automation:', error);
        return false; // Return false if any error occurs
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

// --- How to Run the Function ---
// You can now call loginAndVerify with any credentials.

(async () => {
    // Example usage with credentials from the provided fetch request
    const email = "za441568@gmail.com";
    const password = "^GW#H$TtF3|u";

    console.log(`Attempting to log in with email: ${email}`);
    const result = await loginAndVerify(email, password);

    console.log("\n--------------------");
    console.log("Function execution finished.");
    console.log(`The returned value is: ${result}`);
    console.log("--------------------");
})();

