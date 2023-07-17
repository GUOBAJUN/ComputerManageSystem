using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Diagnostics;
using System.Threading;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Controls;

public sealed partial class UpdateUserConfigContentDialog : ContentDialog
{
    public string Username;
    public double Permission;
    public UpdateResult Result
    {
        get; private set;
    }

    public UpdateUserConfigContentDialog()
    {
        this.InitializeComponent();
        this.NewPermission.Maximum = (Application.Current as App).MyLevel;
        Result= UpdateResult.Cancelled;
    }

    private async void ContentDialog_PrimaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
    {
        if(!string.IsNullOrEmpty(NewPasswd.Password))
        {
            if (string.IsNullOrEmpty(AuthPasswd.Password))
            {
                args.Cancel = true;
                ErrorText.Text = "Authorization required.";
            }
        }
        if (!double.IsNaN(NewPermission.Value))
        {
            if (string.IsNullOrEmpty(AuthPasswd.Password))
            {
                args.Cancel = true;
                ErrorText.Text = "Authorization required.";
            }
        }
        var deferral = args.GetDeferral();
        if(string.IsNullOrEmpty(NewPasswd.Password) && double.IsNaN(NewPermission.Value)) { 
            deferral.Complete();
            return;
        }
        var res1 = await UpdatePasswd();
        var res2 = await UpdatePermission();
        if (res1 && res2)
        {
            Result = UpdateResult.Success;
        }
        else
        {
            Result = UpdateResult.Error;
        }
        deferral.Complete();
    }

    private async Task<bool> UpdatePasswd()
    {
        try
        {
            using StringContent AuthorizeContent = new(
                JsonSerializer.Serialize(new
                {
                    type = "passwd",
                    username = Username,
                    password = AuthPasswd.Password,
                    data = NewPasswd.Password
                }), Encoding.UTF8, "application/json");
            var response = await (Application.Current as App).httpClient.PostAsync("admin/update", AuthorizeContent, new CancellationTokenSource(3000).Token);
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine(ex);
            return false;
        }
    }

    private async Task<bool> UpdatePermission()
    {
        try
        {
            using StringContent AuthorizeContent = new(
                JsonSerializer.Serialize(new
                {
                    type = "permission",
                    username = Username,
                    password = AuthPasswd.Password,
                    data = NewPermission.Value.ToString()
                }), Encoding.UTF8, "application/json");
            var response = await (Application.Current as App).httpClient.PostAsync("admin/update", AuthorizeContent, new CancellationTokenSource(3000).Token);
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private void ContentDialog_CloseButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
    {
        this.Result = UpdateResult.Cancelled;
    }
}

public enum UpdateResult
{
    Success,
    Error,
    Cancelled
}