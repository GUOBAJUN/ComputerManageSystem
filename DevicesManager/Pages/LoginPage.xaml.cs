using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Text.Json;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Security.Cryptography.Core;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;
using System.Net.Http.Headers;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class LoginPage : Page
{

    public LoginPage()
    {
        this.InitializeComponent();

        this.Login_Btn.Click += Login_Btn_Click;
    }

    private async void Login_Btn_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(this.Account_TextBox.Text))
        {
            AccountTip.IsOpen = true;
            return;
        }
        if (string.IsNullOrEmpty(this.Password_PasswdBox.Password))
        {
            PasswordTip.IsOpen = true;
            return;
        }
        this.Login_ProcessRing.Visibility = Visibility.Visible;
        using StringContent jsonContent = new(
            JsonSerializer.Serialize(new
            {
                Account = this.Account_TextBox.Text,
                Password = this.Password_PasswdBox.Password.ToString()
            }),Encoding.UTF8,"application/json");
        try
        {
            using HttpResponseMessage response = await (Application.Current as App).httpClient.PostAsync("admin/login", jsonContent);
            response.EnsureSuccessStatusCode();
            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());
            (Application.Current as App).MyLevel = int.Parse(jsonResponse["permission"].ToString());
            if((Application.Current as App).UDP4TrapBackgroundWorker.IsBusy == false)
            {
                (Application.Current as App).UDP4TrapBackgroundWorker.RunWorkerAsync();
            }
            if((Application.Current as App).UDP6TrapBackgroundWorker.IsBusy == false)
            {
                (Application.Current as App).UDP6TrapBackgroundWorker.RunWorkerAsync();
            }
            Frame.Navigate(typeof(MainPage), this.Account_TextBox.Text);
        }
        catch (TaskCanceledException ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
        catch (HttpRequestException ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
        finally
        {
            this.Login_ProcessRing.Visibility = Visibility.Collapsed;
        }
    }

}
