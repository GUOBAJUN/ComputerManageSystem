using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Newtonsoft.Json.Linq;
using Windows.ApplicationModel.Background;
using Windows.Foundation;
using Windows.Foundation.Collections;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class DashboardPage : Page
{
    public DashboardPage()
    {
        this.InitializeComponent();
    }

    protected async override void OnNavigatedTo(NavigationEventArgs e)
    {
        try
        {
            using HttpResponseMessage response = await (Application.Current as App).httpClient.GetAsync("admin/dashboard");
            response.EnsureSuccessStatusCode();
            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());
            Debug.WriteLine(jsonResponse.ToString());
            this.Alive_Run.Text = jsonResponse["alive"].ToString();
            this.Total_Run.Text = jsonResponse["Total"].ToString();
            this.Host_ProgressRing.Value = (double)int.Parse(jsonResponse["alive"].ToString()) / int.Parse(jsonResponse["Total"].ToString()) * 100;
            this.NetLow_ProgressRing.Value = (double)int.Parse(jsonResponse["net_less_30"].ToString()) / int.Parse(jsonResponse["alive"].ToString()) * 100;
            this.NetMed_ProgressRing.Value = (double)(int.Parse(jsonResponse["alive"].ToString()) - int.Parse(jsonResponse["net_more_80"].ToString())) / int.Parse(jsonResponse["alive"].ToString()) * 100;
            this.NetHigh_ProgressRing.Value = 100;
            var mid = int.Parse(jsonResponse["alive"].ToString()) - int.Parse(jsonResponse["net_less_30"].ToString()) - int.Parse(jsonResponse["net_more_80"].ToString());
            this.NetDist_TextBlock.Text = jsonResponse["net_more_80"].ToString() + "/" + mid.ToString() + "/" + jsonResponse["net_less_30"].ToString();
            this.Mem_ProgressRing.Value = float.Parse(jsonResponse["Memory_Usage"].ToString());
            this.Mem_TextBlock.Text = string.Format("{0:0.00}", float.Parse(jsonResponse["Memory_Usage"].ToString()));
            this.CPU_ProgressRing.Value = float.Parse(jsonResponse["CPU_Usage"].ToString());
            this.CPU_TextBlock.Text = string.Format("{0:0.00}", float.Parse(jsonResponse["CPU_Usage"].ToString()));
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "х╥хо";
            try
            {
                await contentDialog.ShowAsync();
            }
            catch { }
        }
        base.OnNavigatedTo(e);
    }
}
