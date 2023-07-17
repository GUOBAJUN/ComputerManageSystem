using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Text.Json;
using DevicesManager.Controls;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Newtonsoft.Json.Linq;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Media.Core;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class UsersPage : Page
{
    public ObservableCollection<UserDataObject> DataObjects = new();
    public UsersPage()
    {
        this.InitializeComponent();
    }

    protected async override void OnNavigatedTo(NavigationEventArgs e)
    {
        try
        {
            using HttpResponseMessage response = await (Application.Current as App).httpClient.GetAsync("admin/user_all");
            response.EnsureSuccessStatusCode();
            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());

            DataObjects.Clear();
            foreach (var item in jsonResponse["msg"])
            {
                if (int.Parse(item.Value<string>("Permission")) <= (Application.Current as App).MyLevel)
                {
                    var tmp = new UserDataObject(item.Value<string>("Username"), item.Value<string>("Permission"), item.Value<string>("Department"), true);
                    if (item.Value<string>("Username") == "root")
                    {
                        tmp.IsEnable = false;
                    }
                    DataObjects.Add(tmp);
                }
            }
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "确认";
            try
            {
                await contentDialog.ShowAsync();
            }
            catch { }
        }
        base.OnNavigatedTo(e);
    }

    private void Button_Click(object sender, RoutedEventArgs e)
    {
        Frame.Navigate(typeof(RegisterPage));
    }

    private async void HyperlinkButton_Click(object sender, RoutedEventArgs e)
    {
        var sd = sender as HyperlinkButton;
        var AuthDialog = new AuthorizeContentDialog();
        AuthDialog.DataType = "Delete";
        AuthDialog.AuthorizeUrl = "admin/delete";
        AuthDialog.Username = sd.Tag.ToString();
        AuthDialog.XamlRoot = this.XamlRoot;
        AuthDialog.Title = "删除账户";
        AuthDialog.PrimaryButtonText = "确认";
        AuthDialog.CloseButtonText = "取消";
        AuthDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
        
        var result = await AuthDialog.ShowAsync();
        if (result == ContentDialogResult.Primary)
        {
            if (AuthDialog.Result == AuthorizeResult.Authorized)
            {
                Frame.Navigate(typeof(UsersPage));
            }
        }
    }

    private async void Content_GridView_ItemClick(object sender, ItemClickEventArgs e)
    {
        var dialog = new UpdateUserConfigContentDialog();
        dialog.Username = (e.ClickedItem as UserDataObject).Username;
        dialog.XamlRoot = this.XamlRoot;
        dialog.Permission = double.Parse((e.ClickedItem as UserDataObject).Level);
        await dialog.ShowAsync();
        if (dialog.Result == UpdateResult.Success)
        {
            Frame.Navigate(typeof(UsersPage));
        }
    }
}

public class UserDataObject
{
    public string Username;
    public string Level;
    public string Department;
    public bool IsEnable;

    public UserDataObject(string username, string level, string department, bool isEnable)
    {
        Username = username;
        Level = level;
        Department = department;
        IsEnable = isEnable;
    }
}