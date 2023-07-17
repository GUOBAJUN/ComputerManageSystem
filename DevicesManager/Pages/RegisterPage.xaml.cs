using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
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

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class RegisterPage : Page
{
    public RegisterPage()
    {
        this.InitializeComponent();
        this.Level_NumberBox.Maximum = (Application.Current as App).MyLevel;
    }

    private void Button_Click(object sender, RoutedEventArgs e)
    {
        Frame.GoBack();
    }

    private async void Button_Click_1(object sender, RoutedEventArgs e)
    {
        using StringContent jsonContent = new(
            JsonSerializer.Serialize(new
            {
                Account = this.Username_TextBox.Text,
                Password = this.Password_PasswdBox.Password.ToString(),
                level = this.Level_NumberBox.Value.ToString(),
                Department = this.Department_TextBox.Text
            }), Encoding.UTF8, "application/json");
        try
        {
            using HttpResponseMessage response = await (Application.Current as App).httpClient.PostAsync("admin/register", jsonContent);
            response.EnsureSuccessStatusCode();
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Title = "注册成功";
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
            Frame.GoBack();
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            await contentDialog.ShowAsync();
        }
    }
}
